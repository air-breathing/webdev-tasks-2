
const Promise = require('bluebird');
const MongoClient = Promise.promisify(require('mongodb').MongoClient);

function MultivarkaDB() {}

function errorHandler(error) {
    console.log(error);
}

//подключение
function connectToDB(nameserver) {
    //console.log('trying connection', nameserver);
    return MongoClient.connect(nameserver);
}

MultivarkaDB.prototype.server = function (nameServer) {
    this.promise = Promise.resolve(nameServer)
        .then(connectToDB)
        .catch(errorHandler);
    return this;
};

//создание таблицы
function getTableFromDb(nameTable, currentMult) {
    return function (db) {
        currentMult.db = db;
        currentMult.table = db.collection(nameTable);
        return {table: currentMult.table,
            db: db,
            not: false};
    };
}

MultivarkaDB.prototype.collection = function (nameTable) {
    this.promise = this.promise
        .then(getTableFromDb(nameTable, this))
        .catch(errorHandler);
    return this;
};

//выбор колонки
function setColumn(nameColumn) {
    return function (gettingDataOfTable) {
        var data = gettingDataOfTable;
        data.column = nameColumn;
        return data;
    };
}

MultivarkaDB.prototype.where = function (nameColumn) {
    this.promise = this.promise
        .then(setColumn(nameColumn))
        .catch(errorHandler);
    return this;
};

function setValue(value, action) {
    return function (data) {
        if (data.column != undefined) {
            var currentSelect = {};
            //console.log(currentSelect);
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
                    data.not = true;
                    break;
                default:
                    throw new Error('There is no action ' + action);
            }
            data.conditions = {};
            if (data.not) {
                data.conditions[data.column] = {$ne: currentSelect};
            } else {
                data.conditions[data.column] = currentSelect;
            }
            return data;
        } else {
            throw new Error('You must use "where" before.');
        }
    };
}

MultivarkaDB.prototype.equal = function (value) {
    this.promise = this.promise
        .then(setValue(value, 'equal'))
        .catch(errorHandler);
    return this;
};

MultivarkaDB.prototype.lessThen = function (value) {
    this.promise = this.promise
        .then(setValue(value, 'lt'))
        .catch(errorHandler);
    return this;
};

MultivarkaDB.prototype.greatThen = function (value) {
    this.promise = this.promise
        .then(setValue(value, 'gt'))
        .catch(errorHandler);
    return this;
};

MultivarkaDB.prototype.include = function (values) {
    this.promise = this.promise
        .then(setValue(values, 'include'))
        .catch(errorHandler);
    return this;
};

MultivarkaDB.prototype.not = function () {
    this.promise = this.promise
        .then(setValue(undefined, 'not'))
        .catch(errorHandler);
    return this;
};


//кнопки
function findIntoDb(callback) {
    return function (getDataAboutTable) {
        //console.log(getDataAboutTable);
        var dataOfTable = getDataAboutTable;
        //console.log(dataOfTable.conditions);
        return dataOfTable.table.find(dataOfTable.conditions).toArray(
            function (err, data) {
                callback(err, data);
                dataOfTable.db.close();
            }
        );
    };
}

MultivarkaDB.prototype.find = function (callback) {
    this.promise
        .then(findIntoDb(callback))
        .catch(errorHandler);
};

function insertIntoDb(newElement, callback) {
    return function (getDataAboutTable) {
        var dataOfTable = getDataAboutTable;
        var db = dataOfTable.db;
        dataOfTable.table.insert(newElement);
        dataOfTable.table.find().toArray(
            function (err, result) {
                callback(err, result);
                db.close();
            }
        );
    };
}


MultivarkaDB.prototype.insert = function (newElement, callback) {
    this.promise
        .then(insertIntoDb(newElement, callback))
        .catch(errorHandler);
};

function deleteDataFromDB(callback) {
    return function (getDataAboutTable) {
        //console.log(getDataAboutTable);
        var dataOfTable = getDataAboutTable;
        //console.log(dataOfTable.conditions);
        dataOfTable.table.remove(dataOfTable.conditions);
        var db = dataOfTable.db;
        dataOfTable.table.find().toArray(
            function (err, result) {
                callback(err, result);
                db.close();
            }
        );
    };
}


MultivarkaDB.prototype.remove = function (callback) {
    this.promise
        .then(deleteDataFromDB(callback))
        .catch(errorHandler);
};


function setDataFromDB(column, newValue) {
    return function (dataOfTable) {
        //console.log(dataOfTable);
        var dataForUpdate = {};
        dataForUpdate[column] = newValue;
        dataOfTable.updateValues = dataForUpdate;
        return function () {
            return dataOfTable;
        };
    };
}

function update(dataOfTable1) {
    var dataOfTable = dataOfTable1();
    //console.log(dataOfTable);
    if (dataOfTable.conditions == undefined) {
        dataOfTable.conditions = {};
    }
    return dataOfTable.table.update(
        dataOfTable.conditions,
        { $set: dataOfTable.updateValues}, {multi: true });
    //var db = dataOfTable.db;
    //dataOfTable.table.find().toArray(
    //function (err, result) {
    //callback(err, result);
    //db.close();
    //}
    //);
}


function invokeCallback(callback, currentMult) {
    return function () {
        currentMult.table.find().toArray(
            function (err, result) {
                callback(err, result);
                currentMult.db.close();
            }
        );
    };
}

MultivarkaDB.prototype.set = function (nameColumn, newValue) {
    this.promise = this.promise
        .then(setDataFromDB(nameColumn, newValue))
        .catch(errorHandler);
    return this;
};

MultivarkaDB.prototype.update = function (callback) {
    this.promise = this.promise
        .then(update)
        .then(invokeCallback(callback, this))
        .catch(errorHandler);
};

function MultivarkaDBFactory() {
}

MultivarkaDBFactory.prototype.server = function (nameServer) {
    return new MultivarkaDB().server(nameServer);
};

module.exports = new MultivarkaDBFactory();
