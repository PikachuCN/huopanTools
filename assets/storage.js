(function (global) {
  'use strict';

  var KEYS = {
    products: 'live_combo_products_v1',
    productsUpdatedAt: 'live_combo_products_updated_at_v1',
    workspace: 'live_combo_workspace_v1'
  };

  function getStore() {
    try {
      return window.localStorage;
    } catch (err) {
      return null;
    }
  }

  function safeParse(json, fallback) {
    if (!json) {
      return fallback;
    }
    try {
      return JSON.parse(json);
    } catch (err) {
      return fallback;
    }
  }

  function saveProducts(products, updatedAt) {
    var store = getStore();
    if (!store) {
      return;
    }
    store.setItem(KEYS.products, JSON.stringify(Array.isArray(products) ? products : []));
    if (updatedAt) {
      store.setItem(KEYS.productsUpdatedAt, String(updatedAt));
    } else {
      store.removeItem(KEYS.productsUpdatedAt);
    }
  }

  function loadProducts() {
    var store = getStore();
    if (!store) {
      return { products: [], updatedAt: null };
    }
    var products = safeParse(store.getItem(KEYS.products), []);
    var updatedAtRaw = store.getItem(KEYS.productsUpdatedAt);
    var updatedAtNum = updatedAtRaw ? Number(updatedAtRaw) : NaN;

    return {
      products: Array.isArray(products) ? products : [],
      updatedAt: Number.isFinite(updatedAtNum) ? updatedAtNum : null
    };
  }

  function clearProducts() {
    var store = getStore();
    if (!store) {
      return;
    }
    store.removeItem(KEYS.products);
    store.removeItem(KEYS.productsUpdatedAt);
  }

  function saveWorkspace(workspace) {
    var store = getStore();
    if (!store) {
      return;
    }
    store.setItem(KEYS.workspace, JSON.stringify(workspace || {}));
  }

  function loadWorkspace() {
    var store = getStore();
    if (!store) {
      return null;
    }
    return safeParse(store.getItem(KEYS.workspace), null);
  }

  function clearWorkspace() {
    var store = getStore();
    if (!store) {
      return;
    }
    store.removeItem(KEYS.workspace);
  }

  global.AppStorage = {
    saveProducts: saveProducts,
    loadProducts: loadProducts,
    clearProducts: clearProducts,
    saveWorkspace: saveWorkspace,
    loadWorkspace: loadWorkspace,
    clearWorkspace: clearWorkspace
  };
})(window);
