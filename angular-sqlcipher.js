'use strict';

angular.module('ngSqlcipher', [])
    .provider('sqlcipherConfig', function sqlcipherConfigProvider(){
        var _obj = {
            name:'admin',
            password:'admin',
            location:'default',
            iosDatabaseLocation:'defalult'
        };
        var ifTest = false;
        this.onConnectSuccess = new Function();
        this.onConnectError = new Function();
        this.onSuccess = new Function();
        this.onError = new Function();
        this.test = function(_success, _error){
            ifTest = true;
            if(_success){
                this.onConnectSuccess = _success;
            }
            if(_error){
                this.onConnectError = _error;
            }
        };
        this.open = function(_config, _success, _error){
            if(_config.name != null && _config.name != undefined){
                _obj.name = _config.name;
            }else if(_config.password != null && _config.password != undefined){
                _obj.password = _config.password;
            }else if(_config.location != null && _config.location != undefined){
                _obj.location = _config.location;
            }else if(_config.iosDatabaseLocation != null && _config.iosDatabaseLocation != undefined){
                _obj.iosDatabaseLocation = _config.iosDatabaseLocation;
            }
            if(_success){ this.onSuccess = _success; }
            if(_error){ this.onError = _error; }
        };
        this.$get = ['$window', function($window){
            var _sqlcipher;
            if(ifTest){
                $window.sqlitePlugin.echoTest(this.onConnectSuccess, this.onConnectError);    
            }
            _sqlcipher = $window.sqlitePlugin.openDatabase(_obj, this.onSuccess, this.onError);
            _sqlcipher.__proto__.addTrans = _sqlcipher.__proto__.addTransaction;
            _sqlcipher.__proto__.addTransaction = function(t){
                t.__proto__.exec = t.__proto__.executeSql;
                _sqlcipher.__proto__.addTrans.call(this, t);
            };
            return _sqlcipher;
        }];
    })
    .factory('$sqlcipher', ['sqlcipherConfig','$window','$q', function(sqlcipherConfig, $window, $q){
        var Sql = function(){
            this.core = sqlcipherConfig;
            this._version = null;
        };
        /* Basic functions */
        /**
         * All following functions were cover by Promise
         * The success callback functions are converted to chaining callbacks.
         */
        Sql.prototype.exec = function(_state, _data){
            return $q(function(_resolve, _reject){
                sqlcipherConfig.executeSql(_state, _data, _resolve, _reject);
            });
        };
        Sql.prototype.batch = function(_cmdArray){
            return $q(function(_resolve, _reject){
                sqlcipherConfig.sqlBatch(_cmdArray, _resolve, _reject);
            })  
        };
        Sql.prototype.trans = function(_fn){
            return $q(function(_resolve, _reject){
                sqlcipherConfig.transaction(_fn, _reject, _resolve);
            });
        };
        Sql.prototype.readTrans = function(_fn){
            return $q(function(_resolve, _reject){
                sqlcipherConfig.transaction(_fn, _reject, _resolve);
            });
        };
        Sql.prototype.close = function(){
            return $q(function(_resolve, _reject){
                sqlcipherConfig.close(_resolve, _reject);
            });
        };
        
        
        /** Extended functions */
        /**
         * All following functions support repeated calling.
         * Simply say, pretty much like how we use jQuery.
         * By the time I wrote this, those functions aren't stable.
         */
        /**Create Table */
        Sql.prototype.createTable = function(table_name, options, successFn, errorFn){
            var _cmd = 'CREATE TABLE ' + table_name + ' ';
            var _opt = []; var _t = '';
            
            /** "id NOT NULL AUTO INCREMENT, name TEXT, age INTEGER" */
            /** ["id NOT NULL AUTO INCREMENT", "name TEXT", "age INTEGER"] */
            /** {
             *      id:{type:'INTEGER', notNull:false, autoIncrement:true, primary:true},
             *      name:{type:'TEXT', notNull:false},
             *      age:{type:'INTEGER'}
             *  } 
             * */
            if (!Array.isArray(options) && typeof options === 'object'){
                Object.keys(options).forEach(function(item){
                    _t = '';
                    _t = item + ' ';
                    _t += options[item].type?options[item].type:'';
                    _t += options[item].notNull?'NOT NULL ':'';
                    _t += options[item].primary?'PRIMARY ':'';
                    _t += options[item].autoIncrement?'AUTO INCREMENT ':'';
                    _t += options[item].default?'DEFAULT ' + options[item].defalult:'';
                    _t += options[item].unique?'UNIQUE ':'';
                    _t += options[item].check?options[item].check:'';
                    _opt.push(_t);
                })
                _cmd += '(' + _opt.join(',') + ')';
            }else if (typeof options === 'string'){
                _cmd += '(' + options + ')';    
            }else if(options instanceof Array){
                options.forEach(function(item, key){
                    if(typeof item === 'string'){
                    _opt.push(item);
                    }else if(typeof item === 'object'){
                        _t = '';
                        _t += item.name + ' ';
                        _t += item.type?item.type+' ':'';
                        _t += item.notNull?'NOT NULL ':'';
                        _t += item.primary?'PRIMARY ':'';
                        _t += item.autoIncrement?'AUTO INCREMENT ':'';
                        _t += item.default?'DEFAULT ' + options[item].defalult:'';
                        _t += item.unique?'UNIQUE ':'';
                        _t += item.check?options[item].check:'';
                        _opt.push(_t);
                    }
                });
                _cmd += '(' + _opt.join(', ') + ')';
            }else if(options === undefined){
                console.warn('Table columns are suggested to be configured! column ID will be created automatically.');
                _cmd += '(id INTEGER )';
            }else{
                throw new Error('Options has to be String or Array');
            }
            
            sqlcipherConfig.executeSql(_cmd, successFn, errorFn);
            return this;
        }
    
        /** Drop Table */
        Sql.prototype.dropTable = function(table_name, successFn, errorFn){
            /** dropTable(table_name:String, [successFn:Function],[errorFn:Function]) 
             * equivalent to "DROP TABLE table_name"
             */
            if(typeof table_name != 'string'){
                throw new Error('Table name must be in String type.');
            }else{
                var _cmd = 'DROP TABLE ' + table_name;
                sqlcipherConfig.executeSql(_cmd, successFn, errorFn);
            }
            return this;
        }
    
        /** Truncate Table */
        Sql.prototype.truncate = function(table_name){
            /**
             * truncate(table_name:String, [successFn():Function], errorFn():Function)
             * SqLite doesn't have truncate table command, thus the table was deleted and re-created.
             * equivalent to 
             *  > "DROP TABLE table_name;"
             *  > "VACUUM;"
             *  > "CREATE TABLE table_name ({options})";
             */
            var _self = this;
            if(typeof table_name != 'string'){
                throw new Error('Table name must be in String type.');
            }else{
                var _tableSchema=[];
                return $q(function(resolve, reject){
                    sqlcipherConfig.executeSql('DELETE FROM '+ table_name, resolve, reject);
                });
            }
        }
        
        /** Select */
        Sql.prototype.select = function(table_name, cols, conditions){
            /**
             * equivalent to 
             *      SELECT columns1, columns2 FROM table 
             *          WHERE [expression] AND(OR) [expression] 
             *          ORDER BY [expression] 
             *          GROUP BY [expression].
             * @table_name: string
             * @col: array
             * @conditions: object
             */
            var _cmd = '';
            var _cols = [];
            var _conditions = {};
            
            if(typeof table_name != 'string'){ throw new Error('table name must be a String.'); }
            
            if(cols == null){
                _cmd = 'SELECT * FROM ' + table_name;
            }else if(cols instanceof Array && cols.length == 0){
                _cmd = 'SELECT * FROM ' + table_name;
            }else if(cols instanceof Array && cols.length > 0){
                _cols = cols.join();
                _cmd = 'SELECT ' + _cols + ' FROM ' + table_name + ' ';
            }else{
                throw new Error(cols + 'cannot resolve type.');
            }
            
            if(_conditions){
                // where
                if(_conditions.where){
                    _cmd = ' WHERE ' + _conditions.where.replace(/&&/g, ' AND ').replace(/\|\|/g, ' OR ');    
                }
                                
                // group by
                if(_conditions.groupby){
                    if(_conditions.groupby instanceof Array){
                        _cmd += ' GROUP BY ';
                        _cmd += _conditions.groupby.join();
                    }else if(typeof _conditions.groupby === 'string'){
                        _cmd += ' GROUP BY';
                        _cmd += _conditions.groupby;
                    }
                }
                
                // having
                if(_conditions.having && typeof _conditions.having === 'string'){
                    _cmd += ' HAVING ';
                    _cmd += _conditions.having;
                }
                
                // order by
                if(_conditions.orderby && _conditions.orderby instanceof Array){
                    _cmd += ' ORDER BY ' + _conditions.orderby.join();
                }else if(_conditions.orderby && typeof _conditions.orderby === 'string'){
                    _cmd += _conditions.orderby;
                }
                
                // sort
                if(typeof _conditions.sort === 'string' && _conditions.sort.toLowerCase === 'desc' && _conditions.orderby){
                    _cmd += ' DESC';
                }else if(_conditions.orderby){
                    _cmd += ' ASC';
                }

            }
            
            return $q(function(_resolve, _reject){
                sqlcipherConfig.executeSql(_cmd, [], _resolve, _reject);
            });
        }
        
        /** SelectAll */
        Sql.prototype.selectAll = function(table_name){
            /**
             * selectAll(table_name:String) return [{},{}];
             * equivalent to 
             * > "SELECT * FROM table_name;"
             */
            if(typeof table_name != 'string'){
                throw new Error('Table name must be in String type.');
            }else{
                var _cmd = 'SELECT * FROM ' + table_name;
                return $q(function(_resolve, _reject){
                    sqlcipherConfig.executeSql(_cmd, [], _resolve, _reject);
                });
            }
        }
        
        /** Insert Table */
        Sql.prototype.insert = function(table_name, dataSet){
            if (typeof table_name != 'string'){ throw new Error(table_name + ' is not a String.'); }
            if (!(dataSet instanceof Array)) { throw new Error('options must be an Array'); }
            if (dataSet.length == 0) { throw new Error('option length is 0'); }
            
            var cols = [];
            var cmd = 'INSERT INTO ' + table_name;
            
            function insertRows(resultSet, successFn, errorFn){
                for(var i=0; i<resultSet.rows.length; i++){
                    cols.push(resultSet.rows.item(i).name);
                }
                dataSet.forEach(function(item, key){
                    if (key == 0){
                        cmd += ' SELECT ';
                        cols.forEach(function(colName, colIndex){
                            if(item[colName]) {
                                if(colIndex < (cols.length - 1)){
                                    cmd += '"';
                                    cmd += item[colName]?item[colName]:'';
                                    cmd += '" AS ' + colName + ', ';
                                }else{
                                    cmd += '"';
                                    cmd += item[colName]?item[colName]:'';
                                    cmd += '" AS ' + colName;
                                }
                            }
                        });
                    }else{
                        cmd += ' UNION ALL SELECT ';
                        cols.forEach(function(colName, colIndex){
                            if(item[colName]) {
                                if(colIndex < (cols.length - 1)){
                                    cmd += '"';
                                    cmd += item[colName]?item[colName]:'';
                                    cmd += '" AS ' + colName + ', ';
                                }else{
                                    cmd += '"';
                                    cmd += item[colName]?item[colName]:'';
                                    cmd += '" AS ' + colName;
                                }
                            }
                        });
                    }
                });
                /*
                return $q(function(resolve, reject){
                    sqlcipherConfig.executeSql(cmd, resolve, reject);
                })
                */
                return sqlcipherConfig.executeSql(cmd, [], successFn, errorFn);
            }
            
            return $q(function(resolve, reject){
                sqlcipherConfig.executeSql('PRAGMA table_info('+table_name+')',[], function(res){
                    return insertRows(res, resolve, reject);
                }, reject);
            }); 
        }
        
        /** Rename Table */
        Sql.prototype.renameTable = function(old_name, new_name){
            /**
             * equivalent to ALTER TABLE old_name RENAME TO new_name;
             */
            return $q(function(resolve, reject){
                sqlcipherConfig.executeSql('ALTER TABLE ' + old_name + ' RENAME TO ' + new_name, [], resolve, reject);
            });
        }
        
        /** Add Columns */
        Sql.prototype.addColumns = function(table_name, options){
            if(typeof table_name != 'string'){throw new Error('table name is not a string'); }
            /**
             * if options is String. e.g.: addColumns('table', 'age INTEGER NOT NULL');
             * equivalent to 
             */
            if (typeof options === 'string'){
               return $q(function(resolve, reject){
                   sqlcipherConfig.executeSql('ALTER TABLE ' + table_name + ' ADD COLUMN ' + options);
               })
            }
            /**
             * if options is Array, there're two types of Array are supported.
             * [1] e.g.: addColumns('table', ['age INTEGER NOT NULL','identity TEXT UNIQUE']);
             * [2] e.g.: addColumns('table', [
                *  {
                *       name:'age',
                *       type:'INTEGER',
                *       notNull:false
                *  },
                *  {
                *       name:'identity',
                *       type:'TEXT',
                *       primary:true,
                *       unique:true
                *  }
             * ])
             */
            else if(options instanceof Array){
                var _opt = [];
                var _temp = 'ALTER TABLE ' + table_name + ' ADD COLUMN ';
                var _t = '';
                if(options.length == 0){ console.warn('No columns are added.'); return null; }
                else{
                    options.forEach(function(item, key){
                        if(typeof item === 'string'){
                            _opt.push(_temp + item);
                        }else if(typeof item === 'object'){
                            _t = '';
                            _t += item.name + ' ';
                            _t += item.type?item.type+' ':'';
                            _t += item.notNull?'NOT NULL ':'';
                            _t += item.primary?'PRIMARY ':'';
                            _t += item.autoIncrement?'AUTO INCREMENT ':'';
                            _t += item.default?'DEFAULT ' + options[item].defalult:'';
                            _t += item.unique?'UNIQUE ':'';
                            _t += item.check?options[item].check:'';
                            _opt.push(_temp + _t);
                        }
                    });
                    return $q(function(resolve, reject){
                        sqlcipherConfig.transaction(function(tx){
                            // 批量执行ALTER命令
                            _opt.forEach(function(eachCmd){
                                tx.executeSql(eachCmd);
                            })
                        }, reject, resolve);
                    })
                }
            }else{
                throw new Error('options must be String or Array.');
            }
        }

        /** Update Table */
        Sql.prototype.update = function(table_name, options, conditions){
            if(typeof table_name != 'string'){ throw new Error('table name must be String'); }
            if(typeof options != 'object'){ throw new Error('options must be an options'); }
            /** 
             * equivalent to UPDATE TABLE table SET column1 = "value1", column2 = "value2" WHERE [expression] AND/OR [expression];
             * if there's no argument passed in as condition, then the statement will affect all columns.
             */
            var cmd = 'UPDATE ' + table_name + ' SET ';
            var colset = [];
            var _conditions = conditions;
            var _options = Object.keys(options);
            
            _options.forEach(function(colName, key){
                if(typeof options[colName] === 'number'){
                    colset.push(colName + ' = ' + options[colName]);
                }else if(typeof options[colName] === 'string'){
                    colset.push(colName + ' = "' + options[colName] + '"');
                }else if(typeof options[colName] === 'function'){
                    var _ = options[colName]();
                    if(typeof _ === 'number'){
                        colset.push(colName + ' = ' + _);
                    }else if(typeof _ === 'string'){
                        colset.push(colName + ' = "' + _ + '"');
                    }else{
                        throw new Error(colName + ' cannot resolve type.');
                    }
                }else{
                    throw new Error(colName + ' cannot resolve type.');
                }
            });
            cmd += colset.join();
            
            if(_conditions && _conditions.where){
                cmd += ' WHERE ' + _conditions.where.replace(/&&/g, ' AND ').replace(/\|\|/g, ' OR ');   
            }

            return $q(function(resolve, reject){
                sqlcipherConfig.executeSql(cmd, [], resolve, reject);
            })
        }
        
        /**
         * Return a Sql object
         */
        return new Sql();
    }]);
