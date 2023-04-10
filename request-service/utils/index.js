exports.convertArrayField = (data) => {
  const { array, field } = data;
  const result = Array.from(array, (item) => item[field]);
  return result;
};

exports.convertJsonKey = (data) => {
  const { key, array } = data;
  const jsonData = {};
  if (array.length > 0) {
    array.forEach((element) => {
      jsonData[element[key]] = element;
    });
    return jsonData;
  }
  return null;
};
