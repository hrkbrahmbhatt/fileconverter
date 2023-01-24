module.exports.validateData = function (input) {
  if (
    input === null ||
    input === "" ||
    input.length === 0 ||
    input === undefined
  ) {
    return { error: `Please give a value to filename` };
  }
};
