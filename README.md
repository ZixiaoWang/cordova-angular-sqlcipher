# cordova-angular-sqlcipher
The mid-layer between Cordova Angular project and Cordova Sqlcipher plugin.

### HOW TO INSTALL?
1. Import angular js to your project, if you've already had angular js in your project, ignore this step.
2. Install [liteHelpers/Cordova-sqlcipher-adapter](https://github.com/litehelpers/Cordova-sqlcipher-adapter) by entering cmd 
  <code>cordova plugin add https://github.com/litehelpers/Cordova-sqlcipher-adapter</code>
3. Bower install angular-sqlcipher by entering cmd <code>bower install angular-sqlcipher</code> 

------
### How to use it?  
1. Add following <code>script</code> tag into your html.
```html
<script type="text/javascript" src="your-path/angular-sqlcipher.min.js"></script>
```
2. Add <code>ngSqlcipher</code> to your Angular dependencies.  
```javascript
var app = angular.module('myApp', ['ngSqlcipher']);
```
3. Inject service <code>$sqlcipher</code> to the function which requires it.
```javascript
app.
    controller('appCtrl', ['$scope', '$sqlcipher', function($scope, $sqlcipher){
        // ... your code here
    }];
```

------
### Config and create database  
The $sqlcipher services is the object returned after creating database. In original command  
```javascript 
var db = openDatabase('db.name', 'db.version', 'db.description', 'db.size', callbackFn);
```
<code>db</code> is the object after the database <code>db.name</code> was created. And this operation has to
be configured in angular.config.
```javascript
app
    .config(['sqlcipherConfigProvider', function(sqlcipherConfigProvider){
        var options = {
            name:'my.db',
            password:'admin',
            location:'default',
            iosDatabaseLocation:'defalult'
        };
        sqlcipherConfigProvider.open(options, callbackFn);
    }])
```

------
### APIs  
| functions |  |
|----|----|
| [trans(_fn_)](#trans) | equivalent to <code>db.transaction(fn)</code> |
|[readTrans(_fn_)](#readTrans)| equivalent to <code>db.readTransaction(fn)</code>|
|[createTable(_table_name_, _options_)](#createTable)|_table_name_ : String, <br> _options_ : Array, String|
|[dropTable(_table_name_)](#dropTable)| _table_name_ : String |
|[truncate(_table_name_)](#truncate)| _table_name_ : String <br> NOTE: this will erase all the data in table|
|[select(_table_name_, _col_names_, _conditions_)](#select)|_table_name_ : String <br> _col_name_ : Array <br> _conditions_ : Object|
|[selectAll(_table_name_)](#selectAll)|_table_name_ : String <br> This function is equivalent to <Br> <code>SELECT * FROM table_name</code>|
|[insert(_table_name_, _dataSet_)](#insert)|_table_name_ : String <br> _dataSet_ : Array|
|[renameTable(_table_name_, _new_table_name_)](#renameTable)|_table_name_ : String <br> _new_table_name_ : String|
|[addColumns(_table_name_, _cols_)](#addColumns)|_table_name_ : String <br> _cols_ : String or Array|
|[update(_table_name_, _options_, _conditions_)](#update)|_table_name_ : String <br> _options_ : Object <br> _conditions_ : Object |

### Examples   
###### <a id="trans"></a>trans(_fn_)  
<code>$sqlcipher.trans(_fn_).then(_successCallbackFn_).catch(_errorCallbackFn_);</code>
```javascript
$sqlcipher
    .trans(function(tx){
        tx.executeSql('SELECT * FROM table_name')   // Where statements were executed.
    }).then(function(result){
        console.log(result.rows.item(0));           // {name:'Jacky', age:25}
    }).catch(function(err){
        console.log(err);
    })
```  

###### <a id="readTrans"></a>readTrans(_fn_)  
Normally, read-transaction are recommended for <code>SELECT</code> execution.
<code>$sqlcipher.readTrans(_fn_).then(_successCallbackFn_).catch(_errorCallbackFn_);</code>
```javascript
$sqlcipher
    .readTrans(function(tx){
        tx.executeSql('SELECT * FROM table_name')   // Where statements were executed.
    }).then(function(result){
        console.log(result.rows.item(0));           // {name:'Jacky', age:25}
    }).catch(function(err){
        console.log(err);
    })
```

###### <a id="createTable"></a>createTable(_table_name_, _options_)
<code>options</code> can be Array or String.  
<code>$sqlcipher.createTable(_table_name_, _options_).then(_successCallbackFn_).catch(_errorCallbackFn_);</code>
```javascript
// recommended
var options = [
    {name:'id', type:'INTEGER', primary:true, autoIncrement:true},
    {name:'name', type:'TEXT', notNull:true},
    {name:'age', type:'INTEGER'}
];
// or
var options = ['id INTEGER PRIMARY KEY AUTOINCREMENT', 'name TEXT NOT NULL', 'age INTEGER'];
// or
var options = 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER';
$sqlcipher
    .createTable('my_table', options)
    .then((msg) => {console.log(msg);})     // SQLResultSet {rows: SQLResultSetRowList, insertId: 0, rowsAffected: 0}
    .catch((err) => {console.log(err); });  // error messages.
```  

###### <a id="dropTable"></a>dropTable(_table_name_)
```javascript
$ngSqlcipher.dropTable('table_name'); // table will be deleted
```  
  
###### <a id="truncate"></a>truncate(_table_name_)
```javascript
$ngSqlcipher.truncate('table_name');  // table will be erased.
```  

###### <a id="select"></a>select(_table_name_, _col_names_, _conditions_)  
<code>select(_table_name_, _col_names_, _conditions_).then(_successCallbackFn_).catch(_errorCallbackFn_)</code>
```javascript
var conditions = {
    where:'id<10&&name=="Jacky"'
    // groupby:'name',
    // having:'key_word',
    // orderby:'key_word',
    // sort:'key_word'
}
$sqlcipher
    .select('myTable', ['age'], conditions)
    .then( (res) => console.log(res.rows.item(0) )  // return {age:25}
    .catch( (err) => console.log(err) );            // err
```

###### <a id="selectAll"></a>selectAll(_table_name_)
<code>selectAll(_table_name_).then(_successCallbackFn_).catch(_errorCallbackFn_)</code>
```javascript
$sqlcipher
    .selectAll('myTable')
    .then( (res) => console.log(res.rows.item(0) )  // return {name:'Jacky', age:25}
    .catch( (err) => console.log(err) );            // err
```  

###### <a id="insert"></a>insert(_table_name_, _dataSet_)
<code>insert('table_name', dataSet).then(_successCallbackFn_).catch(_errorCallbackFn_)</code>
```javascript
var dataSet = [
    {name:'Rynn', age:30},
    {name:'Amy', age:22}
]
$sqlcipher 
    .insert('myTable', dataSet)
    .then((res)=>{console.log(res)})                // d {$$state: Object} NOTE: this is a promise type
    .catch( (err) => console.log(err) );            // err
```

###### <a id="renameTable"></a>renameTable(_table_name_, _new_table_name_)
<code>renameTable('myTable', 'myNewTable')</code>
```javascript
$sqlcipher.renameTable('myTable', 'myNewTable');    // table will be renamed;
```

###### <a id="addColumns"></a>addColumns(_table_name_, _cols_)
<code>addColumns('myTable', _cols_)</code>
```javascript
var cols = [
    {name:'gender', type:'TEXT'},
    {name:'title', type:'TEXT'}
];
/* or */ cols = ['gender TEXT', 'title TEXT'];
/* or */ cols = 'gender TEXT, title TEXT';
$sqlcipher
    .addColumns('myTable', cols)
    .then((res) => console.log(res))                // d {$$state: Object} NOTE: this is a promise type
    .catch((err) => console.log(err))               // err
```

###### <a id="update"></a>update(_table_name_, _options_, _conditions_)
<code>update(_table_name_, _options_, _conditions_)</code>
```javascript
var options = {
    age:23,
    title:'Software Developer' // or Ingeter, function
}
var conditions = {
    where:'id<10' // where only
}
$sqlcipher
    .update('myTable', options, conditions)
    .then((res) => console.log(res))
    .catch((res) => console.log(res))
```

------
### What if I do not want to use those APIs?  
For this situation, use following methods:  
<code> var db = $sqlcipher.core; </code>  
<code>db</code> is the oringinal object returned by openDatabase() function.
