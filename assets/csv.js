(function (global) {
  'use strict';

  var HEADER_ALIASES = {
    product_id: ['product_id', 'id', 'sku', 'productid'],
    product_name: ['product_name', 'name', 'title', 'productname'],
    cost: ['cost', 'price', 'unit_cost', 'costprice'],
    image_url: ['image_url', 'img', 'image', 'pic', 'photo', 'imageurl'],
    stock: ['stock', 'inventory', 'qty', 'quantity', 'remain', 'stocks']
  };

  function normalizeHeaderName(value) {
    return String(value || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .replace(/[\s\-_]/g, '');
  }

  function parseCsvRows(text) {
    var input = String(text || '');
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < input.length; i += 1) {
      var char = input[i];

      if (inQuotes) {
        if (char === '"') {
          if (input[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        // ignore
      } else {
        field += char;
      }
    }

    row.push(field);
    rows.push(row);

    return rows.filter(function (r) {
      return r.some(function (cell) {
        return String(cell || '').trim() !== '';
      });
    });
  }

  function resolveHeaderMap(headerRow) {
    var normalized = headerRow.map(normalizeHeaderName);
    var map = {
      product_id: -1,
      product_name: -1,
      cost: -1,
      image_url: -1,
      stock: -1
    };

    Object.keys(map).forEach(function (key) {
      var aliases = HEADER_ALIASES[key];
      for (var i = 0; i < normalized.length; i += 1) {
        if (aliases.indexOf(normalized[i]) >= 0) {
          map[key] = i;
          break;
        }
      }
    });

    return map;
  }

  function cleanNumericText(value) {
    return String(value || '')
      .replace(/[,\s，￥元]/g, '')
      .trim();
  }

  function parseLooseNumber(value) {
    var cleaned = cleanNumericText(value);
    if (!cleaned) {
      return NaN;
    }
    var num = Number(cleaned);
    return Number.isFinite(num) ? num : NaN;
  }

  function parseLooseInteger(value) {
    var num = parseLooseNumber(value);
    if (!Number.isFinite(num)) {
      return NaN;
    }
    return Math.floor(num);
  }

  function getCell(row, index) {
    if (index < 0 || index >= row.length) {
      return '';
    }
    return row[index];
  }

  function importProducts(text) {
    var rows = parseCsvRows(text);
    if (rows.length < 2) {
      throw new Error('CSV 至少需要包含表头和一行数据。');
    }

    var headerMap = resolveHeaderMap(rows[0]);
    var required = ['product_id', 'product_name', 'cost'];
    var missing = required.filter(function (key) {
      return headerMap[key] === -1;
    });
    if (missing.length > 0) {
      throw new Error('缺少必要列：' + missing.join(', '));
    }

    var warnings = [];
    if (headerMap.stock === -1) {
      warnings.push('未找到 stock 列，库存默认按 0 处理。');
    }

    var dedupe = new Map();

    for (var i = 1; i < rows.length; i += 1) {
      var row = rows[i];
      var line = i + 1;

      var id = String(getCell(row, headerMap.product_id) || '').trim();
      var name = String(getCell(row, headerMap.product_name) || '').trim();

      if (!id) {
        warnings.push('第 ' + line + ' 行缺少 product_id，已跳过。');
        continue;
      }

      var costRaw = getCell(row, headerMap.cost);
      var costNum = parseLooseNumber(costRaw);
      if (!Number.isFinite(costNum)) {
        warnings.push('第 ' + line + ' 行 cost 非法，已按 0 处理。');
        costNum = 0;
      }

      var stockNum = 0;
      if (headerMap.stock !== -1) {
        stockNum = parseLooseInteger(getCell(row, headerMap.stock));
        if (!Number.isFinite(stockNum) || stockNum < 0) {
          warnings.push('第 ' + line + ' 行 stock 非法，已按 0 处理。');
          stockNum = 0;
        }
      }

      var imageUrl = '';
      if (headerMap.image_url !== -1) {
        imageUrl = String(getCell(row, headerMap.image_url) || '').trim();
      }

      if (dedupe.has(id)) {
        warnings.push('product_id=' + id + ' 重复，已使用最后一条记录覆盖。');
      }

      dedupe.set(id, {
        product_id: id,
        product_name: name || id,
        cost: costNum,
        image_url: imageUrl,
        stock: stockNum
      });
    }

    var products = Array.from(dedupe.values());
    if (products.length === 0) {
      throw new Error('没有可用的产品数据。');
    }

    return {
      products: products,
      warnings: warnings
    };
  }

  global.CSVUtils = {
    parseCsvRows: parseCsvRows,
    parseLooseNumber: parseLooseNumber,
    parseLooseInteger: parseLooseInteger,
    importProducts: importProducts
  };
})(window);
