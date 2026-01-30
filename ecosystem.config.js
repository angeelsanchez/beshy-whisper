module.exports = {
  apps: [{
    name: 'beshy-whisper',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/beshy-whisper',
    env_file: '.env.local'
  }]
};
