# This part of test automation framework 
This script stimulates behavior

 - Pars the working directory for test collection
 - Call newman on the found list and produce test reports
 - Read results from json data file.
 - Report all results to Zephyr Jira Plugin. 

NAME

    newmanZAPI.js

SYNOPSIS

    newmanZAPI.js [options]

DESCRIPTION

    Load the test result data in newman's json format containing executed test cases. 
    For each test case, the script verifies whether it exists in qTest Manager.
        IF the (automation-) test case does not exist, the script will:
         - Create automation test case in Zephyr Jira Plugin
         - Create test Cycles associated with the above test case
         - Submit test execution log to the test run
        IF the (automaiton-) test case exists and there is no test run associate with it, the script will:
         - Create test cycle associated with the test case
         - Submit test execution result to the test run
        IF the (automation-) test case and test cycle exist, the script will:
         - Submit test execution result to the test run

USAGE

    -f file             Test result file

    -m format           Format of test result file, options are: newman-json

    -i usetestcaseid    If true, will assume name of test result is the test case ID (fastest)
                        If false, will assume name of test result is the test case name

    -r regex            Where the ID or name is looked for (based on usetestcaseid)
                        By default it is the entire test case name

                        Example: (\D+)* if we're looking for digits at the start
                        TC_Name_(.+)$ if we're looking for a name after the words
                        TC_Name_ to the end

    -p parentid         This will look for a matching Release, then Test Cycle,
                        then Test Suite for a matching id
                        This will be the directory structure we will look under
                        for matching test executions

                        NOTE: If a test execution appears twice, BOTH execution results will be added

    -t parenttype       The type of folder to look in to store the test results. this is related to parentid
                        Values can be 'release' 'test-suite' or 'test-cycle'

    -c credentials      The file that has the appropriate qTest Credentials for this script.
                        It should be json content, like below:
                        {
                            email: "<qtest_email>",
                            password: "<qtest_password>",
                            qtestUrl: "<qtest_url>"
                        }

HOW TO RUN

PREREQUISITES

  - Install nodejs from [here](https://nodejs.org/en/download/)
  - Configure nodejs path in your system environment variable.
  - May need the Test manger setting if configured to update test caaes

SETUP

- Download this sample script to a directory (eg:    E:\shell-agent-samples\newmanZAPI)
- Update **creds.json** file, for example:

```
    {
        "email": "demo@qas.com",
        "password": "demo@#1345",
        "qtestUrl": "https://demo.qtestnet.com"
    }
```
RUN

Open command prompt inside the directory which contains sample script, and execute below command

```
    npm install newman -g
    npm install -g newman-reporter-junitfull
    
    npm install
    node newmanZAPI.js -f newman-json-result.json -c creds.json -o <qtest_project_id>
```
OUTPUT

```
    Successfully uploaded test case [13514528] with status PASS to test run TR-11
    Successfully uploaded test case [13514544] with status PASS to test run TR-12
    Successfully uploaded test case [13514548] with status FAIL to test run TR-13
    Successfully uploaded test case [13514549] with status PASS to test run TR-14
    Successfully uploaded test case [13514550] with status PASS to test run TR-15
    Successfully uploaded test case [13514551] with status FAIL to test run TR-16
    Successfully uploaded test case [13514552] with status PASS to test run TR-17
    Successfully uploaded test case [13514553] with status FAIL to test run TR-18
```
 
# How to execute this sample script via Shell Agent inside qTest Automation Host

This section will introduce how to setup qTest Automation Integration with Shell agent

1. First, download and install qTest Automation Host [here](https://support.qasymphony.com/hc/en-us/articles/115005225543-Download-Automation-Agent-Host)
2. From qTest Automation Host, create an agent which is of type "Shell Agent" in your qTest Automation Host with detail configuration as below:

### For windows
Your sample scripts is at E:\shell-agent-samples\postman-nodesjs
![Configuration1](/postman-nodesjs/images/shell-agent.png?raw=true)

### For MacOS / Linux: 
Your sample script is at /Users/demo/shell-agent-samples/postman-nodesjs
![Configuration2](/postman-nodesjs/images/shell-agent-2.png?raw=true)

3. From qTest Manager, select a test run which is created from sample automation project above, click 'Schedule' and choose 'Immediately upon scheduled'
### Schedule
![Configuration3](/postman-nodesjs/images/test-run.png?raw=true)
4. In qTest Automation Host, select the Shell Agent created in step 2, click 'Run now'. When the script execution finished, click 'Show log' to view all logs include system field and custom field of test run / test suite from the log.

For more detailed instructions on how to create the shell agent, follow this article: [Create Shell Agent](https://support.qasymphony.com/hc/en-us/articles/115005558783-Create-Shell-Agent)


PSK:
    Validate Areguments, 
     read arguments and display help if not as required
     loginToQTest get the access token and send it in doOurBusiness
        doOurBusiness
             getFieldsOfTestCase : Connect to Zapi and get testcases fields from settings
             uploadTestResultsToZAPI
                uploadTestRunLog load (Taks excution_i) and call submit
                    submitTestLogPerTestRun: submit then call load
                        uploadTestRunLog which load the next result and call submit

                    submitTestLogPerTestRun: Search for test case if not found it will be created  then :how        to search for test case
                    serach test runs:: How ro serach for test run(test cykel) 
                    searchTestRunsAndSubmitResults    :
                        searchTestRuns
                        submitTestResultsToZAPI
                            submitATestRunLog

searchTestCase serach for test case name., here we should finde the name or Key
In Jenkins what works before changes was:
docker run -v ContinuousTesting:/etc/newman -t postman/newman_ubuntu1404 run \"System Test/APITA.register.card.then.buy.ticket.postman_collection.json\" --environment=\"EnvironmentFiles/APITA.TEST.postman_environment.json\"
-r junit --reporter-junit-export newmanRunResult2.xml -n 2

install newman -g
install express -g
run : node newmanZapi.js -f newman-json-result.json -e SystemTest -o 10000projctID
npm install -g newman-reporter-junitfull

# Build the image
docker build -t test . 

# Run the image with bash support , should not have entrypoint
docker run -it test:latest /bin/sh 
# Run the image WILL RUN THE SCRIP
docker run -it test:latest

-------------------------------------------------------
…or create a new repository on the command line
echo "# TestAutomation" >> README.md
git init
--git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/pskitsme92/TestAutomation.git
git push -u origin main
…or push an existing repository from the command line
git remote add origin https://github.com/pskitsme92/TestAutomation.git
git branch -M main
git push -u origin main
----------------------------------  ccta github -----------------------------------
w89265
eutk_api_testautomation_ccta