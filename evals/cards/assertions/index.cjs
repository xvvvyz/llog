const contract = require('./contract.cjs');
const separationAnxiety = require('./separation-anxiety.cjs');

module.exports = {
  cardOutput: contract.cardOutput,
  refreshSeparationAnxiety: separationAnxiety.refreshSeparationAnxiety,
  separationAnxiety: separationAnxiety.separationAnxiety,
  triggerTweak: separationAnxiety.triggerTweak,
};
