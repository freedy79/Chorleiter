// Dieser einfache In-Memory-Store hält den Status von laufenden Import-Jobs.
const jobStore = new Map();

const createJob = (jobId) => {
    const job = {
        id: jobId,
        status: 'pending',
        progress: 0,
        total: 0,
        logs: [],
        result: null,
        error: null
    };
    jobStore.set(jobId, job);
    return job;
};

const getJob = (jobId) => {
    return jobStore.get(jobId);
};

const updateJobLog = (jobId, message) => {
    const job = getJob(jobId);
    if (job) {
        job.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    }
};

const updateJobProgress = (jobId, current, total) => {
    const job = getJob(jobId);
    if (job) {
        job.progress = current;
        job.total = total;
    }
}

const completeJob = (jobId, result) => {
    const job = getJob(jobId);
    if (job) {
        job.status = 'completed';
        job.result = result;
        // Job nach einiger Zeit löschen, um den Speicher freizugeben
        setTimeout(() => jobStore.delete(jobId), 5 * 60 * 1000); // 5 Minuten
    }
};

const failJob = (jobId, error) => {
    const job = getJob(jobId);
    if (job) {
        job.status = 'failed';
        job.error = error;
        setTimeout(() => jobStore.delete(jobId), 5 * 60 * 1000);
    }
};

module.exports = {
    createJob,
    getJob,
    updateJobLog,
    updateJobProgress,
    completeJob,
    failJob
};