
const Promise = require('bluebird');
const MongoClient = Promise.promisify(require('mongodb').MongoClient);

function MultivarkaDB() {
    this.state = 0;
}

MultivarkaDB.prototype.close = function (data) {
    //console.log(data);
    if (this.db != undefined) {
        this.db.close();
    }
};

//подключение
function connectToDB(nameserver) {
    this.state = 1;
    return MongoClient.connect(nameserver);
}

MultivarkaDB.prototype.server = function (nameServer) {
    this.promise = Promise.resolve(nameServer)
        .bind(this)
        .then(connectToDB);
    return this;
};

//создание коллекции
function getTableFromDb(nameTable) {
    return function (db) {
        this.db = db;
        this.state = 2;
        return db.collection(nameTable);
    };
}

MultivarkaDB.prototype.collection = function (nameTable) {
    this.promise = this.promise
        .then(getTableFromDb(nameTable));
    return this;
};

MultivarkaDB.prototype.where = function (nameColumn) {
    this.nameColumn = nameColumn;
    return this;
};

MultivarkaDB.prototype.setValue = function (value, action) {
    var currentSelect = {};
    switch (action) {
        case 'equal':
            currentSelect = value;
            break;
        case 'lt':
            currentSelect.$lt = value;
            break;
        case 'gt':
            currentSelect.$gt = value;
            break;
        case 'include':
            currentSelect.$in = value;
            break;
        case 'not':
            this.not = true;
            break;
        default:
            throw new Error('There is no action ' + action);
    }
    this.conditions = {};
    if (this.not) {
        this.conditions[this.nameColumn] = {$ne: currentSelect};
    } else {
        this.conditions[this.nameColumn] = currentSelect;
    }
};


MultivarkaDB.prototype.equal = function (value) {
    this.setValue(value, 'equal');
    return this;
};

MultivarkaDB.prototype.lessThen = function (value) {
    this.setValue(value, 'lt');
    return this;
};

MultivarkaDB.prototype.greatThen = function (value) {
    this.setValue(value, 'gt');
    return this;
};

MultivarkaDB.prototype.include = function (values) {
    this.setValue(values, 'include');
    return this;
};

MultivarkaDB.prototype.not = function () {
    this.setValue(undefined, 'not');
    return this;
};


//кнопки

//проверка подключения
function checkConnection(table) {
    if (this.state == 1) {
        this.db = table;
        throw new Error('Collection was not choosen');
    } else if (this.state == 0) {
        throw new Error('DB was not connected');
    }
    return table;
}

//для поиска по условиям
function findIntoDb() {
    return function (table) {
        return table.find(this.conditions).toArray();
    };
}

function outputUpdates() {
    return this.table.find().toArray();
}

function invokeCallbackAfterSucsess(callback) {
    return function (data) {
        return callback(undefined, data);
    };
}

function invokeCallbackAfterError(callback) {
    return function (err) {
        return callback(err);
    };
}

MultivarkaDB.prototype.find = function (callback) {
    this.promise
        .then(checkConnection)
        .then(findIntoDb())
        .then(invokeCallbackAfterSucsess(callback))
        .catch(invokeCallbackAfterError(callback))
        .finally(this.close);
};

function insertIntoDb(newElement) {
    return function (table) {
        this.table = table;
        return table.insert(newElement);
    };
}

MultivarkaDB.prototype.insert = function (newElement, callback) {
    this.promise
        .then(checkConnection)
        .then(insertIntoDb(newElement))
        .then(outputUpdates)
        .then(invokeCallbackAfterSucsess(callback))
        .catch(invokeCallbackAfterError(callback))
        .finally(this.close);
};

function deleteDataFromDB() {
    return function (table) {
        this.table = table;
        return table.remove(this.conditions);
    };
}


MultivarkaDB.prototype.remove = function (callback) {
    this.promise
        .then(checkConnection)
        .then(deleteDataFromDB())
        .then(outputUpdates)
        .then(invokeCallbackAfterSucsess(callback))
        .catch(invokeCallbackAfterError(callback))
        .finally(this.close);
};


MultivarkaDB.prototype.setDataFromDB = function (column, newValue) {
    var dataForUpdate = {};
    dataForUpdate[column] = newValue;
    this.updateValues = dataForUpdate;
};

function update(table) {
    this.table = table;
    if (this.conditions == undefined) {
        this.conditions = {};
    }
    return table.update(
        this.conditions,
        { $set: this.updateValues}, {multi: true });
}


MultivarkaDB.prototype.set = function (nameColumn, newValue) {
    this.setDataFromDB(nameColumn, newValue);
    return this;
};

MultivarkaDB.prototype.update = function (callback) {
    this.promise
        .then(checkConnection)
        .then(update)
        .then(outputUpdates)
        .then(invokeCallbackAfterSucsess(callback))
        .catch(invokeCallbackAfterError(callback))
        .finally(this.close);
};

function MultivarkaDBFactory() {}

MultivarkaDBFactory.prototype.server = function (nameServer) {
    return new MultivarkaDB().server(nameServer);
};

module.exports = new MultivarkaDBFactory();
