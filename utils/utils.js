module.exports.countOccurrence = (array, value) => {
  const count = array.reduce((acc, obj) => {
    const key = obj[value];
    if (key in acc) {
      acc[key]++;
    } else {
      acc[key] = 1;
    }
    return acc;
  }, {});
  return count;
};

module.exports.characteristicsMeta = (data) => {
  const results = data.reduce((acc, arr) => {
    arr.forEach((item) => {
      if (!acc.hasOwnProperty(item.name)) {
        acc[item.name] = {
          id: item.characteristic_id,
          value: item.value / data.length,
        };
      } else {
        const current = acc[item.name].value;
        acc[item.name] = {
          id: item.characteristic_id,
          value: item.value / data.length + current,
        };
      }
    });
    return acc;
  }, {});

  for (let key in results) {
    results[key].value = results[key].value.toFixed(4);
  }
  return results;
};
