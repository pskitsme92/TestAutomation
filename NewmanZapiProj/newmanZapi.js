#!/usr/bin/env node
/**
 * @fileOverview This sample code illustrates how one can read all collection files within a directory and run them
 * in parallel.
 */
var newman = require('newman'); //require('../'),  
const express = require('express');
const appExpress = express();

const port = 9000;
var simulate = false;
var commandLineArgs = require("command-line-args");
var request = require("request");
var fs = require("fs");
var promise = require("promise");

const webdriver = require('selenium-webdriver');

const optionDefinitions = [
    { name: "file", alias: "f", type: String },
    { name: "format", alias: "m", type: String, defaultValue: "newman-json" },
    { name: "usetestcaseid", alias: "u", type: Boolean },
    { name: "regex", alias: "r", type: String, defaultValue: "(.*)" },
    { name: "parentId", alias: "p", type: String },
    { name: "parentType", alias: "t", type: String, defaultValue: "root" },
   // { name: "credentials", alias: "c", type: String }, to be added
    { name: "testenviroment", alias: "e", type: String },
    { name: "help", alias: "h", type: Boolean },
    { name: "projectId", alias: "o", type: String },
    { name: "projectName", alias: "n", type: String },
    { name: "jobStatus", alias: "j", type: String },
    { name: "dynamic", alias: "d", type: String }
];

/**
 * parses command arguments and store them in the options object
 */
const options = commandLineArgs(optionDefinitions);

if (options.help) {
    var helptext = fs.readFileSync("help.txt", "utf8");
    console.log(helptext);
    process.exit(0);
}

/**
 * validates command arguments, if they are not well-formed, print the error and exit
 */
validateCommandLineArgs(options, function (err) {
    if (err) {
        // print error to the console and exit
        console.log("Command line args validation error: " + err);
        process.exit(-1);
    }
});

/**
 * loads login credentials from creds.json
 */
var creds = JSON.parse(fs.readFileSync("creds.json", "utf8"));
const authenticationbase64 = "Basic " + ("a2gxMjYxOjEwSnVscHNrPw==").toString("base64");
//loginToQTest(creds).then(function () {   
   doOurBusiness(authenticationbase64);
/*}).catch(function (err) {
    console.log(err);
    handleErrorAndExit(err);
});
*/
/**
 * validates command line arguments  
*/
function validateCommandLineArgs(options, cb) {
    if (!options.file) {
        cb("Missing required input file. Try -h for help");
    }

    if (!options.projectId) {
        cb("Missing required project Id file. Try -h for help");
    }

    // if (!options.credentials) {
    //     cb("Missing required field. Try -h for help");
    // }
    if (!options.testenviroment) {
        cb("Missing required enviroment. Try -h for help");
    }
}


/**
 * parses new man JSON result
 */
function parseResultsFile() {
    console.log("projectId: " + options.projectId);   
    if (options.hasOwnProperty("jobStatus")) {
        console.log("jobStatus: " + options.jobStatus);
    }
    if (options.hasOwnProperty("projectName")) {
        console.log("projectName: " + options.projectName);
    }
    if (options.hasOwnProperty("dynamic")) {
        console.log("dynamic: " + options.dynamic);
    }

    // this function does nothing here but shows
    // how to access magic variables used by the automation host
    getQTEObjectFromAgentParameterPath();

    var testCasesList = [];

    if (options.format == "newman-json") {
        var testCaseId;
        var results = JSON.parse(fs.readFileSync(options.file, "utf8"));

        // loop through all test testCases results in JSON file
        var testtestCases = results.run.executions;
        testtestCases.forEach(function (exec, index) {
            if (!options.uetestcaseid) {
                testCaseId = 0;
                console.log("useCaseID is set to false");
            }
            else {  
                var splitedlist = exec.item.name.split("::");
                testcaseId = splitedlist.length >1 ? splitedlist[0] : 0 ; 
                var reg = new RegExp(options.regex, "i");
                match = reg.exec(exec.item.name);
                reg = undefined;
                reg = new RegExp("[0-9]", "i");
                var nextMatch = reg.exec(match[0]);
                testCaseId = nextMatch ? parseInt(nextMatch[0]) : 0;
            }

            // create test run log that we will upload later
            var testCase = {
                name: exec.item.name,
                status: "PASS",
                testCaseId: testCaseId,
                error: "\n"//,teststeps:[teststep:{name:"":assertion,status,error}
            };            //exec.assertions:[assertion:{assertion,PASS,,""}]
            
            // Set pass unless one of the assertions has an error
            exec.assertions.forEach(function (assertion, i) {
                // teststepID = nextMatch ? parseInt(nextMatch[0]) : 0;
                // or: teststepID= exec.item.name.split("::")[0]
                if (assertion.error) {
                    testCase.status = "FAIL";//teststep.status="fail"
                    testCase.error += testCase.error + assertion.error.message + " \n Stack: " + assertion.error.stack;
                }   //teststep.error = assertion.error.message afterif teststeps.push(teststep)                                
            });
            testCasesList.push(testCase);
        });
    }
    return testCasesList;
}

function doOurBusiness(authenticationBase64) {
    var customFields;
    var testCasesList = parseResultsFile();

    getFieldsOfTestCase(authenticationBase64).then(function (res) {
        customFields = res;
        uploadTestResultsToZAPI(testCasesList,authenticationBase64, customFields)        
        .then(function() {
            console.log("uploadTestResultsToQTest finished.");
        }).catch(function(err) {
            console.log ("uploadTestResultsToQTest error: " + err);
        });
    }).catch(function(err) {
        handleErrorAndExit("Error: " + err);
    });
}

function uploadTestResultsToZAPI(testCasesList, authenticationBase64, customFields) {
    return new Promise(function (resolved, reject) {
        var uploadTestRunLog = function (index,authenticationBase64, testCasesList) {
            if (index >= testCasesList.length) {
                resolved(true);
                return;
            }
            submitTestLogPerTestRun(testCasesList[index], authenticationBase64, customFields).then(function (res) {
                if (res == true) {
                    uploadTestRunLog(index + 1, testCasesList);
                }
                else {
                    console.log("Failed to submit test log");
                    resolved();
                }
            });
        };
        uploadTestRunLog(0,authenticationBase64, testCasesList);
    });
}

function submitTestLogPerTestRun(testRun,authenticationBase64, customFields) {
    var status = false;
    return new Promise(function (resolved, reject) {
        if (testRun.testCaseId == 0) {
            searchTestCase(testRun,authenticationBase64).then(function (res) {
                if (res == false) {
                    createAutomationTestCase(testRun,customFields,authenticationBase64).then(function () {
                        status = searchTestCyclesAndSubmitResults(testRun,authenticationBase64);
                        resolved(status);
                    }, function (err) {
                        handleErrorAndExit(err);
                    });
                }
                else {
                    searchTestCyclesAndSubmitResults(testRun,authenticationBase64).then(function (status) {
                        resolved(status);
                    }, function (err) {
                        handleErrorAndExit(err);
                    });
                }
            }, function (err) {
                reject(err);
            });
        }
        else {
            searchTestCyclesAndSubmitResults(testRun,authenticationBase64 ).then(function (status) {
                resolved(status);
            }, function (err) {
                handleErrorAndExit(err);
            });
        }
    });
}

function searchTestCyclesAndSubmitResults(testRun,authenticationBase64) {
    // search test run
    return searchTestCycles(testRun,authenticationBase64).then(function (res) {
        return submitTestResultsToZAPI(testRun,authenticationBase64, res).then(function (res) {
            return res;
        });
    }, function (err) {
        handleErrorAndExit(err);
        return false;
    });
}
function submitTestResultsToZAPI(testRun, listTestRuns, authenticationBase64) {
    return new Promise(function (resolved, reject) {
        var submitTestCycleLogs = function (index, listTestRuns) {
            if (index >= listTestRuns.length) {
                resolved(true);
                return;
            }
            submitATestCycleLog(testRun, listTestRuns[index], authenticationBase64).then(function (res) {
                // submit test run log to next test run in the list
                submitTestCycleLogs(index + 1, listTestRuns);
            }, function (err) {
                handleErrorAndExit(err);
            });
        };
        submitTestCycleLogs(0, listTestRuns);
    });
}

function getFieldsOfTestCase(authenticationBase64) {
/**
 * This may not work and may have to create JSON file manualy
 */
    return new Promise(function (resolved, reject) {
        var opts = {
            //url: creds.zapiUrl + "/api/v3/projects/" + options.projectId + "/settings/test-cases/fields",
            //GET::http://localhost:2990/jira/rest/zapi/latest/zql/clauses
            url:creds.baseURL  + creds.zapiUrl + creds.GetSearchClausesURL,
            json: true,
            headers: {
                "Content-Type": "application/json",
                //"Authorization": " Basic " + Base64.encode(creds.zapiUserName + ":" + creds.zapiPassword)
                "Authorization": authenticationBase64 // " Basic " + creds.zapiUserName + ":" + creds.zapiPassword
            }          

        };
        request.get(opts, function (err, response, body) {
            if (err){
                console.log("getFieldOfTestCase::Error::" +err);
                reject("Unable to get field of test case: " + err);
            }
            else{
                console.log("getFieldOfTestCase::received::"+JSON.stringify(body));
                resolved(body);
            }

        });
    });
}


/**
 * searches for test case using name of the passed in test run. 
 * If found,  associate test case id to the testRun.testCaseId
 */
function searchTestCase(testRun, authenticationBase64) {
    return new Promise(function (resolved, reject) {
        // use test case name as automation_content field
        var query = "'Automation Content' = '" + testRun.name + "'";
        var opts = {
            url: creds.baseURL  + creds.zapiUrl + "/api/v3/projects/" + options.projectId + "/search",
            json: true,
            headers: {
                "Content-Type": "application/json",
                //"Authorization": " Basic " + Base64.encode(creds.zapiUserName + ":" + creds.zapiPassword)
                "Authorization": authenticationBase64 //
            },
            body: {
                object_type: "test-cases",
                fields: ["*"],
                query: query
            }               
        };

        request.post(opts, function (err, response, body) {
            if (err) {
                reject("Unable to search test case: " + err);
            } else {
                if (response.statusCode == 200) {
                    if (body.total > 100) {
                        reject("Returned more than 100 matching runs! This software isn't built to handle this... yet!");
                    } else if (body.items.length == 0) {
                        resolved(false);
                    } else {
                        // found it, get first test case's id which is matched with automation content
                        // and associate it with the testRun.testCaseId
                        testRun.testCaseId = body.items[0].id;
                        resolved(true);
                    }
                }
                else {
                    reject("Response code: " + response.statusCode + " with message " + response.statusMessage);
                }
            }
        });
    });
}

function createAutomationTestCase(testRun, customFields,authenticationBase64) {
    return new Promise(function (resolved, reject) {
        var properties = [];
        var itemField;
        // init  data for test case object
        customFields.forEach(function (item, index) {
            itemField = {};
            if (item.original_name == "AutomationTestCase") {
                itemField.field_id = item.id;
                for (var i = 0; i < item.allowed_values.length; i++) {
                    if (item.allowed_values[i].label == "Yes") {
                        itemField.field_value = item.allowed_values[i].value;
                    }
                }
            }
            if (item.original_name == "ClassIdTestCase") {
                itemField.field_id = item.id;
                itemField.field_value = testRun.name;
            }
            if (itemField.hasOwnProperty("field_id")) {
                properties.push(itemField);
            }
        });
        var opts = {
            url: creds.baseURL  + creds.zapiUrl + options.projectId + "/test-cases",
            json: true,
            headers: {
                "Content-Type": "application/json",
               //"Authorization": " Basic " + Base64.encode(creds.zapiUserName + ":" + creds.zapiPassword)
               "Authorization": authenticationBase64
            },           
            body: {
                "issues": testsToAdd,
                "versionId": versionId,
                "cycleId": newCycleId,
                "projectId": projectId,
                "method": "1"    
            }
        };
        request.post(opts, function (err, response, body) {
            if (err) {
                reject("Error creating new automation test case: " + err);
            } else {
                testRun.testCaseId = body.id;
                resolved();
            }
        });
    });
}

function searchTestCycles(testRun) {
    return new Promise(function (resolve, reject) {
        //find test run and upload result and get our matching test runs
        var query = "'Test Case Id' = '" + testRun.testCaseId + "'";
        if (!options.usetestcaseid) {
            query = "'Name' = '" + testRun.testcase + "'"; // Note that this is the name of the Test Case, not Test Run
        }
        var opts = {
            url: creds.baseURL  + creds.zapiUrl + "/api/v3/projects/" + options.projectId + "/search",
            json: true,
            headers: {
                "Content-Type": "application/json",
               //"Authorization": " Basic " + Base64.encode(creds.zapiUserName + ":" + creds.zapiPassword)
               "Authorization": " Basic " + creds.zapiUserName + ":" + creds.zapiPassword
            },
            body: {
                object_type: "test-runs",
                fields: ["*"],
                query: query
            }
        };
        request.post(opts, function (err, response, body) {
            if (err) {
                reject("Error querying parent folder: " + err);
            } else {
                if (body.total > 100) {
                    reject("Returned more than 100 matching test runs! This software isn't built to handle this... yet!");
                } else if (body.hasOwnProperty("items") && body.items.length == 0) {
                    //create new test run
                    createAutomationTestRun(testRun).then(function (res) {
                        resolve(res);
                    });
                } else {
                    resolve(body.items);
                }
            }
        });
    });
}
function createAutomationTestRun(testRun) {
    return new Promise(function (resolve, reject) {
        var query = "";
        // empty/anything else is root
        if (options.parentId) {
            query = "?parentId=" + options.parentId;
            if (options.parentType)
                query += "&parentType=" + options.parentType;
        }
        var opts = {
            url: creds.baseURL  + creds.zapiUrl  + "/api/v3/projects/" + options.projectId + "/test-runs" + query,
            json: true,
            headers: {
                "Content-Type": "application/json",
                //"Authorization": " Basic " + Base64.encode(creds.zapiUserName + ":" + creds.zapiPassword)
                "Authorization": authenticationBase64 
            },
            body: {
                name: testRun.name,
                test_case: {
                    id: testRun.testCaseId
                }
            }
        };
        request.post(opts, function (err, response, body) {
            if (err) {
                reject("Error creating new automation test run: " + err);
            } else {
                //upload test test results
                var items = [];
                items.push(body);
                resolve(items);
            }
        });
    });
}

/**
 * upload results
 * - items is an array of test-run objects
 * - Could use Submit a Test Log or automation log depending on how you want your test cases linked
 */

function submitATestCycleLog(testRun, item,authenticationBase64) {
    newCycleValues = dumps();
    return new Promise(function (resolve, reject) {
        var opts = {
            url: creds.baseURL  + creds.zapiUrl + createCycleURL, // creds.zapiUrl + "/api/v3/projects/" + options.projectId + "/test-runs/" + item.id + "/auto-test-logs",
            json: true,
            headers: {
                "Content-Type": "application/json",
                //"Authorization": " Basic " + Base64.encode(creds.zapiUserName + ":" + creds.zapiPassword)
                "Authorization": authenticationBase64
            },
            body: {
                "clonedCycleId": "" +item.id ,
                "name": item.pid + ":" + testRun.name + "AutomatedCycle Created In ZAPI" + new Date(),
                "build": ""+testRun.error ? testRun.error : "Successfully Automation Run",
                "environment": "Automation",
                "description": "Created In ZAPI",
                "startDate": new Date(), //"20/Nov/13",
                "endDate":  new Date(), //"20/Nov/14",
                "projectId": projectId,
                "versionId": versionId
                
            }
        };
        request.post(opts, function (err, response, body) {
            if (err) {
                reject("Error uploading test result with values : " + JSON.stringify(opts) + "\n\nERROR: " + err);
            } else {
                console.log("Successfully uploaded test case [" + testRun.testCaseId + "] with status " + testRun.status + " to test run " + item.pid);
                resolve();
            }
        });
    });

}

// get QTE object from PARAMETERS_PATH
function getQTEObjectFromAgentParameterPath() {
    if (process.env.hasOwnProperty("QTE_SCHEDULED_TX_DATA")) {
        console.log("Value of process.env.QTE_SCHEDULED_TX_DATA: " + process.env.QTE_SCHEDULED_TX_DATA);
        console.log("---------------------------------------------");

        if (process.env.QTE_SCHEDULED_TX_DATA != "") {
            var opts = {
                url: process.env.QTE_SCHEDULED_TX_DATA,
                json: true,
                headers: {
                    "Content-Type": "application/json"
                }
            };
            request.get(opts, function (err, response, body) {
                if (err)
                    handleErrorAndExit("Error getting QTE json object from agent.\n\nERROR: " + err);
                else {
                    if (body != undefined) {
                        console.log("body: " + JSON.stringify(body));
                        //var testRunsObj = body.testRuns;
                        var field, strTestRun, index;
                        var testRunsObj = body.QTE.testRuns;
                        strTestRun = "";
                        for (index = 0; index < testRunsObj.length; index++) {
                            field = testRunsObj[index];
                            strTestRun += "====================\n";
                            for (var k in field) {
                                if (field.hasOwnProperty(k)) {
                                    strTestRun += k + " field has value \"" + field[k] + "\"\n";
                                }
                            }
                            strTestRun += "\n====================\n";
                        }
                        strTestRun += "\nDYNAMIC \n";
                        strTestRun += "\n====================\n";
                        if (body.hasOwnProperty("dynamic")) {
                            for (var kk in body.dynamic) {
                                if (body.dynamic.hasOwnProperty(kk)) {
                                    strTestRun += kk + " has value \"" + body.dynamic[kk] + "\"\n";
                                }
                            }
                        }
                        console.log("====================");
                        console.log("test run object: " + strTestRun);
                        console.log("====================");
                    }
                }
            });
        }
    }
}


function newmanRunCollectionInDir(workdir){
    console.log( `Working Directory: ${workdir}`);    
    var collectiondir = workdir+options.testenviroment+"/";
    console.log("Collection Dir:"+collectiondir);
    var enviromentDir = workdir + "EnvironmentFiles/";
    console.log("ENviroment Directory:"+enviromentDir);
    var reportDir = workdir + "reports/";
                               
    console.log("Report Directory:"+reportDir);
    var files;
    fs.readdir(collectiondir, function (err, allfiles) {        
        if (err) { throw err; }
              
        // we filter all files with JSON file extension
        console.log("input files Bwfore filter:"+allfiles);       
        files = allfiles.filter(function (file) {
             return (/^((?!(package(-lock)?))|.+)\.json/).test(file);
         }); 
        console.log("input files After filter:"+files);       
        // now we iterate on each file name and call newman.run using each file name
        return new Promise(function (resolve, reject) {
            allfiles.forEach(function (file) {
                var outputfile = `${file}$`.substr(0,(file.length - 5) )+".xml";
                outputfile = reportDir + outputfile ;
                console.log("outputfile:" + outputfile);
                var collectionfile = collectiondir+"/"+file; 
                // if(file === "ST01_1APITA.register.card.And.buy.ticketChangeCancel.postman_collection.json" )
                    
                if(!simulate){
                    newman.run({
                        // we load collection using require. for better validation and handling
                        // JSON.parse could be used
                        collection: require(collectionfile),
                        environment: `${enviromentDir}APITA.TEST.postman_environment.json`,
                        globals:`${enviromentDir}MyWorkspace.postman_globals.json`,
                        'delay-request': 1000,
                        reporters: 'junitfull',
                        timeout: 250000,
                        'timeout-request':1000,
                        'timeout-scrip':1000,
                        insecure: false,
                        reporter: {
                            junitfull: {
                                export: `${outputfile}` // If not specified, the file will be written to `newman/` in the current working directory.
                            }
                        },
                    }, function (err) {
                            // finally, when the collection executes, print the status
                            console.info(`${file}: ${err ? err.name + "::"+err.message : 'ok'}!`);
                            if (err) {
                                reject("Error running file " );
                            } else {
                                console.log("File run OK");
                                resolve();
                            }
                        });
                } else{
                        console.log(`Newman ran on collection file:${file}`);
                }
            }); // the entire flow can be made more elegant using `async` module
        });
        //console.log("newmanRunCollectionInDir:End for each");    
    });
    console.log("newmanRunCollectionInDir:Out");
}


function AddHourstoLocalTime() {
    var event = new Date();
    event.setHours(event.getHours()+2);
    console.log(event.toString());
    // expected output: Wed Oct 05 2011 16:48:00 GMT+0200 (CEST)
    // (note: your timezone may vary)

    console.log(event.toISOString());
    // expected output: 2011-10-05T14:48:00.000Z
    //document.getElementById("demo").innerHTML = 
    console.log( `${event.toISOString()}`);
    console.log("AddHourstoLocalTime:Out");

}


function handleErrorAndExit(err) {
    console.log(err);
    process.exit(-1);
}

/*------------------------------------------------------------------------------------------------------------------------
 Adding simple selenium test to support POC
 PRE: npm install -g selenium-webdriver --Should be installed on Host  or added to docker

------------------------------------------------------------------------------------------------------------------------*/


async function runTestWithCaps (capabilities) {
  let driver = new webdriver.Builder()
    .usingServer('http://fornavnefternvn_zR4k3d:52TudCdBjYoTpfYGaXud@hub-cloud.browserstack.com/wd/hub')
    .withCapabilities({
      ...capabilities,
      ...capabilities['browser'] && { browserName: capabilities['browser']}  // Because NodeJS language binding requires browserName to be defined
    })
    .build();
  await driver.get("http://www.google.com");
  const inputField = await driver.findElement(webdriver.By.name("q"));
  await inputField.sendKeys("BrowserStack", webdriver.Key.ENTER); // this submits on desktop browsers
  try {
    await driver.wait(webdriver.until.titleMatches(/BrowserStack/i), 5000);
  } catch (e) {
    await inputField.submit(); // this helps in mobile browsers
  }
  try {
    await driver.wait(webdriver.until.titleMatches(/BrowserStack/i), 5000);
    console.log(await driver.getTitle());
    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason": "Title contains BrowserStack!"}}'
    );
  } catch (e) {
    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Page could not load in time"}}'
    );
  }
  await driver.quit();
}
const capabilities1 = {
  'browser': 'chrome',
  'browser_version': 'latest',
  'os': 'Windows',
  'os_version': '10',
  'build': 'browserstack-build-1',
  'name': 'Parallel test 1'
};
const capabilities2 = {
	'browser': 'firefox',
  'browser_version': 'latest',
  'os': 'Windows',
  'os_version': '10',
  'build': 'browserstack-build-1',
  'name': 'Parallel test 2'
};
const capabilities3 = {
	'browser': 'safari',
  'browser_version': 'latest',
  'os': 'OS X',
  'os_version': 'Big Sur',
  'build': 'browserstack-build-1',
  'name': 'Parallel test 3'
};
function SeleniumSimpleTest(){
    
    runTestWithCaps(capabilities1);
    runTestWithCaps(capabilities2);
    runTestWithCaps(capabilities3);
}

var dirname = "../";//__dirname +'../../../sb-apita-api/ContinuousTesting/System Test';
console.log(" working dirname:" +dirname);
newmanRunCollectionInDir(dirname);
SeleniumSimpleTest();
//appExpress.listen(port,()=>console.log(`Express appl listining at port ${port}`));
//AddHourstoLocalTime();
console.log("ends Process 0");
//process.exit(0);
