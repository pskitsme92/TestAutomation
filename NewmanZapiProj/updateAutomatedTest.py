# ////////////////////////////////////////////////////////////////////////////
# //
# //  D SOFTWARE INCORPORATED
# //  Copyright 2007-2014 D Software Incorporated
# //  All Rights Reserved.
# //
# //  NOTICE: D Software permits you to use, modify, and distribute this file
# //  in accordance with the terms of the license agreement accompanying it.
# //
# //  Unless required by applicable law or agreed to in writing, software
# //  distributed under the License is distributed on an "AS IS" BASIS,
# //  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# //
# ////////////////////////////////////////////////////////////////////////////
#
# This is a sample of what can be done by using API with Zephyr for JIRA through the Python coding language.
# The goal of the sample is to create a new test cycle and add existing test issues into it
# 
# IDLE IDE - Version: 2.7.5
# Python - Version: 2.7.5
# 
# Author: Daniel Gannon, Technical Support Analyst, D Software Inc.

# Import from libraries 'urllib2', 'urllib', 'json', 'base64'
from urllib2 import Request, urlopen
from urllib import urlencode
from json import load, dumps
from base64 import b64encode

# Variables used:
username = 'test.manager'
password = 'test.manager'
validateString = '</a>testSWDJ4</td><td>Success</td>'
file = '0_sWD_j4.html'
projectId = 10200
versionId = 10000

# 'baseURL' holds basic data for JIRA server that will be used in API URL calls
baseURL = 'http://localhost:8081'
getCyclesURL = baseURL + '/rest/zapi/latest/cycle'
getExecutionsURL = baseURL + '/rest/zapi/latest/execution'
executeURL = baseURL + '/rest/zapi/latest/execution'

# 'headers' holds information to be sent with the JSON data set
# Initialized with Auth and Content-Type data
# Authorization header uses base64 encoded username and password string
headers = {"Authorization": " Basic " + b64encode(username + ":" + password), "Content-Type": "application/json"}

# ///// Save Automated Output as List /////
# Parse automation result file from automation tool
# Set execution status based on keyword string

print "Finding Automation Results File..."

f = open(file)
fileString = f.read()

if validateString in fileString:
    exStatus = 1
else:
    exStatus = 2

f.close()

print "Results File Parsed! Execution Status Saved!\n"

# ///// Get Latest Automation Cycle in Project-Version /////
# Search for cycles based on Project and Version
# Save the newest cycle to be used for updating executions
# Code uses highest ID number but there are other ways to do this

print "Fetching Latest Automation Cycle..."

cycleValues = {
    "projectId": projectId,
    "versionId": versionId
}

getCyclesURL = getCyclesURL + "?" + urlencode(cycleValues)

request =  Request(getCyclesURL, None, headers=headers)
js_res = urlopen(request)
fetchedCycles = load(js_res)

cycleIdList = []
i = iter(fetchedCycles)
for x in range(len(fetchedCycles)-1):
    cycleIdList.append(int(i.next()))

cycleIdList.sort()
cycleIdList.reverse()
latestAutomationCycleId = cycleIdList[0]

print "Fetched Latest Automation Cycle!\n"

# ///// Fetch Executions from Newest Automation Cycle /////
# Fetch executions based on fetched cycle ID

print "Grabbing Executions from Fetched Cycle..."

fetchExecutionValues = {
    "action": "expand",
    "cycleId": latestAutomationCycleId
}

getExecutionsURL = getExecutionsURL + '/?' + urlencode(fetchExecutionValues)

request = Request(getExecutionsURL, None, headers=headers)
js_res = urlopen(request)
objResponse = load(js_res)

fetchedExecutions = objResponse['executions']
executionIdList = []
for rs in fetchedExecutions:
    executionIdList.append(str(rs['id']))

print "Fetched Executions Completed. Number of Execution Assignments Found: " + str(len(executionIdList)) + "\n"

# ///// Quick Execute Based on Fetched Executions /////
# Quick execute based on the parsed results file earlier

print "Updating Cycle Execution(s) Status with Automation Results..."

values = dumps ({
    "status": exStatus
})

for x in range(len(executionIdList)):
    executeURL = executeURL + '/' + executionIdList[x-1] + '/quickExecute'
    request = Request(executeURL, data=values, headers=headers)
    urlopen(request)

print "Automation Cycle Updated with Execution Status"
