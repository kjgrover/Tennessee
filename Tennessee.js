
var mysql = require("mysql")
var vols = require("./vols.json")
var fs = require('fs');


var key = [];
var year = [];
var wins = [];
var losses = [];
var ties = [];
var pct = [];
var coach = [];
var distinctCoach = [];
var totalWins;
var datasetOne= [];
var datasetTwo= [];
var datasetThree= [];
var q = 0;
var p = 1;

for (i=0; i<vols.length; i++){
    key.push(vols[i].Rk);
    year.push(vols[i].Year);
    wins.push(vols[i].W);
    losses.push(vols[i].L);
    ties.push(vols[i].T);
    pct.push(vols[i].Pct);
    coach.push(vols[i].Coach)
}

//my local database you will need to create and enter your own mysql database for this code to work
var connection = mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "root",
    database: "vols_db"
  });

connection.connect(function(err) {
    if (err) throw err;
    console.log("connected as id " + connection.threadId + "\n");  

//This sequal function creates a table in the database called "neyland"
function sequal(){

  var sqlOne = "INSERT INTO neyland (year, wins, losses, ties, pct, coach) VALUES ("+year[p]+", "+wins[p]+", "+losses[p]+", "+ties[p]+", "+pct[p]+", '"+[coach[p]]+"' );";
  connection.query(sqlOne, function (err, result) {
    if (err) throw err;
    console.log("added data to neyland");
      });
//the setTimeout below is used to stop this function from breaking mysql by slowing down the time between the recursive queries to mysql
    if (!err){
      setTimeout(function () {
         p++
        sequal()
      },1000)
    }
}

//The sqlTwo query will find all distinct coaches from the the neyland table. This is needed for the sequalTwo function
var sqlTwo = "SELECT DISTINCT coach FROM vols_db.neyland;";
connection.query(sqlTwo, function (err, result) {
    if (err) throw err;
    console.log(result[0].coach);

    for (k=0; k<result.length; k++){
      distinctCoach.push(result[k].coach)
    }

    console.log("distinct coaches "+distinctCoach)

    var sqlThree = "SELECT SUM(wins) FROM vols_db.neyland;";
    connection.query(sqlThree, function (err, result) {
      if (err) throw err;
  
      totalWins = result[0]['SUM(wins)']
    });

    sequalTwo()
  });
        


// The sequalTwo function is a recursive function that will use the distinctCoach value to build objects that will be pushed into the data files
function sequalTwo(){
  console.log("this is query " +distinctCoach[q])

  // the sqlFour query data is used to create data of total wins for each coach that will be used in the pie diagram
  var sqlFour = "SELECT SUM(wins) FROM vols_db.neyland WHERE coach = '"+distinctCoach[q]+"';";
  connection.query(sqlFour, function (err, result) {
    if (err) throw err;

    var objOne = {};
    objOne["category"] = distinctCoach[q];
    objOne["measure"]= (result[0]['SUM(wins)']/totalWins).toPrecision(3);
    datasetOne.push(objOne)
    console.log(datasetOne)
  });

  // the sqlFive query data is used to collect the average win per year of each coach and push that data into an object to be used in the bubble diagram
  var sqlFive = "SELECT SUM(wins)/COUNT(coach) FROM vols_db.neyland WHERE coach ='"+distinctCoach[q]+"';";
  connection.query(sqlFive, function (err, result) {
    if (err) throw err;
    
    var objTwo = {};
    objTwo["Name"] = distinctCoach[q];
    objTwo["Count"]= result[0]['SUM(wins)/COUNT(coach)'].toPrecision(2);
    datasetTwo.push(objTwo)
    console.log(datasetTwo)
  });

  if (!err && distinctCoach[q+1] != undefined){
    setTimeout(function () {
      q++
      sequalTwo()
    },1000)
  }

  if (distinctCoach[q+1] == undefined){

    // The sqlSix query is used to collect data on total wins, losses, and percent of wins for the dashboard 
    var sqlSix = "SELECT SUM(wins), SUM(losses), SUM(ties), 100*SUM(wins)/(SUM(wins)+SUM(losses)) FROM vols_db.neyland;";
    connection.query(sqlSix, function (err, result) {
      if (err) throw err;

      var objThree = {};
      objThree["Wins"] = result[0]['SUM(wins)'];
      objThree["Losses"]= result[0]['SUM(losses)'];
      objThree["Percent"]= result[0]['100*SUM(wins)/(SUM(wins)+SUM(losses))'];
      objThree["ties"]= result[0]['SUM(ties)'];
      datasetThree.push(objThree)
      console.log(datasetThree)
      console.log(JSON.stringify(datasetThree, null, 2))
      });
    
      setTimeout(function () {
        fs.writeFileSync('./data/dataPie.json', JSON.stringify(datasetOne, null, 2) , 'utf-8');
        fs.writeFileSync('./data/dataBubbles.json', JSON.stringify(datasetTwo, null, 2) , 'utf-8');
        fs.writeFileSync('./data/stats.json', JSON.stringify(datasetThree, null, 2) , 'utf-8');
        connection.end()
        }, 9000)
    }    
  }
});


