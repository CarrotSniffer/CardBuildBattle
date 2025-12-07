/**
 * Cluster Mode Server
 * Spawns one worker per CPU core for maximum performance
 * Can handle thousands of concurrent games
 */

const cluster = require('cluster');
const os = require('os');

// Configuration
const cpuCount = os.cpus().length;
let NUM_WORKERS;

// Parse WORKERS env variable: "half", "all", or a number
const workersEnv = process.env.WORKERS || 'all';
if (workersEnv === 'half') {
    NUM_WORKERS = Math.max(1, Math.floor(cpuCount / 2));
} else if (workersEnv === 'all') {
    NUM_WORKERS = cpuCount;
} else {
    const parsed = parseInt(workersEnv, 10);
    NUM_WORKERS = isNaN(parsed) ? cpuCount : Math.min(parsed, cpuCount);
}

const RESTART_DELAY = 1000; // ms before restarting a crashed worker

if (cluster.isPrimary) {
    console.log('========================================');
    console.log('  Strategic Card Game - Cluster Mode');
    console.log('========================================');
    console.log(`  Primary process: ${process.pid}`);
    console.log(`  CPU cores available: ${cpuCount}`);
    console.log(`  Workers to spawn: ${NUM_WORKERS} (${workersEnv === 'half' ? 'half cores' : workersEnv === 'all' ? 'all cores' : 'custom'})`);
    console.log(`  Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total`);
    console.log('========================================\n');

    // Track worker stats
    const workerStats = new Map();

    // Fork workers
    for (let i = 0; i < NUM_WORKERS; i++) {
        const worker = cluster.fork();
        workerStats.set(worker.id, { games: 0, connections: 0, startTime: Date.now() });
    }

    // Handle worker messages (for stats collection)
    cluster.on('message', (worker, message) => {
        if (message.type === 'stats') {
            workerStats.set(worker.id, {
                ...workerStats.get(worker.id),
                ...message.stats
            });
        }
    });

    // Handle worker death - restart automatically
    cluster.on('exit', (worker, code, signal) => {
        const stats = workerStats.get(worker.id);
        console.log(`[Cluster] Worker ${worker.id} died (${signal || code}). Restarting...`);
        workerStats.delete(worker.id);

        // Restart after delay
        setTimeout(() => {
            const newWorker = cluster.fork();
            workerStats.set(newWorker.id, { games: 0, connections: 0, startTime: Date.now() });
        }, RESTART_DELAY);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n[Cluster] Received SIGTERM, shutting down gracefully...');
        for (const id in cluster.workers) {
            cluster.workers[id].send({ type: 'shutdown' });
        }
        setTimeout(() => process.exit(0), 5000);
    });

    process.on('SIGINT', () => {
        console.log('\n[Cluster] Received SIGINT, shutting down...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });

    // Print stats every 30 seconds
    setInterval(() => {
        let totalGames = 0;
        let totalConnections = 0;

        workerStats.forEach((stats, workerId) => {
            totalGames += stats.games || 0;
            totalConnections += stats.connections || 0;
        });

        const memUsage = process.memoryUsage();
        console.log(`[Cluster Stats] Workers: ${workerStats.size} | Games: ${totalGames} | Connections: ${totalConnections} | Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    }, 30000);

} else {
    // Worker process - run the actual server
    console.log(`[Worker ${cluster.worker.id}] Starting on PID ${process.pid}`);

    // Import and run the server
    require('./index.js');

    // Handle shutdown message from primary
    process.on('message', (message) => {
        if (message.type === 'shutdown') {
            console.log(`[Worker ${cluster.worker.id}] Shutting down gracefully...`);
            // Give time for connections to close
            setTimeout(() => process.exit(0), 3000);
        }
    });

    // Report stats to primary periodically
    setInterval(() => {
        // These would need to be tracked in index.js and exported
        // For now, we'll send placeholder stats
        if (process.send) {
            process.send({
                type: 'stats',
                stats: {
                    // These should come from the actual game/player managers
                    games: global.activeGames || 0,
                    connections: global.activeConnections || 0
                }
            });
        }
    }, 10000);
}
