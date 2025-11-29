module.exports = {
  apps: [{
    name: 'beshy-whisper',
    script: 'npm',
    args: 'start',
    cwd: __dirname,
    env_file: '.env.local'
  }]
};
