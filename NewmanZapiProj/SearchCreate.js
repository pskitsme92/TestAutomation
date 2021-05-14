https://github.com/zabolennyi/zephyr-jira-cypress

https://github.com/vinicius-araujo/zephyr-protractor-reporter:


    this.getIssueIdByKey = (issueKey) => {
        return popsicle.request({
            method: 'GET',
            url: `${options.host}/rest/agile/1.0` + '/issue/' + issueKey,
            body: {},
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }).use(auth(options.jiraApi.username, options.jiraApi.apiToken))
        .use(popsicle.plugins.parse('json'))
        .then((res) => {
            if (res.body.id) {
                return res.body.id;
            } else {
                console.error('no issue found');
                return '-1';
            }
        }).catch((error) => {
            console.error(error);
            return '-1';
        });

    };


var zqlSearch = function(query) {
    return callZapiCloud('POST', '/zql/search?', 'application/json', ...__ZAPIcreds, { 'zqlQuery': `${query}` }).then(searchResults => {
        if(!searchResults) { return false;}
        let result = {
            totalTests: searchResults.totalCount,
            tests: []
        };
        searchResults.searchObjectList.forEach(a => {
            result.tests.push({
                key: a.issueKey,
                summary: a.issueSummary,
                status: a.execution.status.name,
                desc: a.issueDescription,
                executionId: a.execution.id,
                issueId: a.execution.issueId
            });
        });
        return result;
    }, (err) => {
        console.log(`An error had occured with the callZapiCloud "${err}"`); 
    })
    .catch(function(e) {console.log(`An error had occured with the ZAPI api call: "${e} ${query}"`); })
}


function callZapiCloud(METHOD, URI, CONTENT_TYPE, ACCESS_KEY, SECRET_KEY, USER, BODY) {
    const hash = crypto.createHash('sha256');
    const iat = new Date().getTime();
    const exp = iat + 3600;
    const BASE_URL = 'https://prod-api.zephyr4jiracloud.com/connect';
    let API_URL = 'https://prod-api.zephyr4jiracloud.com/connect/public/rest/api/1.0' + URI;
    let RELATIVE_PATH = API_URL.split(BASE_URL)[1].split('?')[0];
    let QUERY_STRING = API_URL.split(BASE_URL)[1].split('?')[1];
    let CANONICAL_PATH;
    if (QUERY_STRING) {
        CANONICAL_PATH = `${METHOD}&${RELATIVE_PATH}&${QUERY_STRING}`;
    } else {
        CANONICAL_PATH = `${METHOD}&${RELATIVE_PATH}&`;
    }

    // console.log(CANONICAL_PATH)

    hash.update(CANONICAL_PATH);
    let encodedQsh = hash.digest('hex');

    let payload = {
        'sub': USER,
        'qsh': encodedQsh,
        'iss': ACCESS_KEY,
        'iat': iat,
        'exp': exp
    };

    let token = jwt.sign(payload, SECRET_KEY, {algorithm: 'HS256'});
    let options = {
        'method': METHOD,
        'timeout': 45000,
        'url': API_URL,
        'headers': {
            'zapiAccessKey': ACCESS_KEY,
            'Authorization': 'JWT ' + token,
            'Content-Type': CONTENT_TYPE
        },
        'json': BODY
    };

    let result = createPromiseCall(debug, options);
    return result;
}
const JiraService = (options) => {
    
    this.getIssueIdByKey = (issueKey) => {
        return popsicle.request({
            method: 'GET',
            url: `${options.host}/rest/agile/1.0` + '/issue/' + issueKey,
            body: {},
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }).use(auth(options.jiraApi.username, options.jiraApi.apiToken))
        .use(popsicle.plugins.parse('json'))
        .then((res) => {
            if (res.body.id) {
                return res.body.id;
            } else {
                console.error('no issue found');
                return '-1';
            }
        }).catch((error) => {
            console.error(error);
            return '-1';
        });

    };
	
	  module.exports = function(spec) {

    if (this.disabled) {
        return;
    }
    if (spec.status === 'disabled' || spec.status === 'pending') {
        this.specPromisesResolve[spec.id]();
        return;
    }

    let specStatus = '1';
    if (spec.status !== 'passed') {
        specStatus = '2';
        this.globals.status = '2';
    }
    if (spec.description.indexOf('@') == -1) {
        this.specPromisesResolve[spec.id]();
        if(this.globals.feedback) {
            if(spec.status == 'passed') {
                console.log("\x1b[32m%s\x1b[0m" ,` ✓  ${spec.description}`);
            } else {
                console.log("\x1b[31m%s\x1b[0m" ,` X  ${spec.description}`);
            }
        }
        return;
    }

    const issueKey = spec.description.split('@')[1];
    this.globals.issueKey = issueKey;

    if(this.globals.feedback) {
        if(spec.status == 'passed') {
            console.log("\x1b[32m%s\x1b[0m" ,` ✓  ${spec.description.split('@')[0]}`);
        } else {
            console.log("\x1b[31m%s\x1b[0m" ,` X  ${spec.description.split('@')[0]}`);
        }
    }

    this.zapiService.getExecutionsForIssue(issueKey).then((list) => {
        if(!list) { return this.specPromisesResolve[spec.id]() }
        if(list.tests.length > 0) {
            this.jiraService().getIssueIdByKey(issueKey).then((issueId) => {
                this.zapiService.updateExecutionStatus(
                list.tests[0].executionId,
                issueId,
                this.globals.projectId,
                specStatus)
                .then(() => {
                    this.specPromisesResolve[spec.id]()
                }, (error) => this.specPromisesResolve[spec.id]())
            }, (error) => this.specPromisesResolve[spec.id]())
        } else {
            createNewTestExecution.call(this);
        }
    }, (error) => this.specPromisesResolve[spec.id]())

    function createNewTestExecution () {        
        this.jiraService().getIssueIdByKey(issueKey).then((issueId) => {
            this.zapiService.createAdHocExecutionById(issueId, this.globals.projectId).then((executionId) => {
                this.globals.executionId = executionId;
                this.zapiService.updateExecutionStatus(
                    this.globals.executionId,
                    issueId,
                    this.globals.projectId,
                    specStatus)
                    .then(() => {
                        this.specPromisesResolve[spec.id]();
                    }, (error) => this.specPromisesResolve[spec.id]())
            }, (error) => this.specPromisesResolve[spec.id]());
        }, (error) => this.specPromisesResolve[spec.id]());
    }


}
	
	/////////////////////////////////////////////////
	https://github.com/myuzhang/zfjcloud-client/blob/master/zephyrService.js
	const jwt = require('json-web-token');
const request = require('request');
const syncRequest = require('sync-request');
const crypto = require('crypto');

module.exports = class Zephyr {
        constructor(accessKey, secretKey, user) {
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.user = user;

        this.cloudUrl = 'https://prod-api.zephyr4jiracloud.com/connect';
        this.cloudApiUrl = `${this.cloudUrl}/public/rest/api/1.0`
    }

    // The method is from https://github.com/nickguimond/ZAPI under MIT
    callZapiCloud(isAsync, method, apiUrl, contentType, body) {
        const hash = crypto.createHash('sha256');
        const iat = new Date().getTime();
        const exp = iat + 3600;
        const BASE_URL = this.cloudUrl;
        let RELATIVE_PATH = apiUrl.split(BASE_URL)[1].split('?')[0];
        let QUERY_STRING = apiUrl.split(BASE_URL)[1].split('?')[1];
        let CANONICAL_PATH;
        if (QUERY_STRING) {
            CANONICAL_PATH = `${method}&${RELATIVE_PATH}&${QUERY_STRING}`;
        } else {
            CANONICAL_PATH = `${method}&${RELATIVE_PATH}&`;
        }
    
        hash.update(CANONICAL_PATH);
        let encodedQsh = hash.digest('hex');
    
        let payload = {
            'sub': this.user,
            'qsh': encodedQsh,
            'iss': this.accessKey,
            'iat': iat,
            'exp': exp
        };
    
        let token = jwt.encode(this.secretKey, payload, 'HS256', function(err, token) {
            if (err) { console.error(err.name, err.message); }
            else { return token; }
        });

        if (isAsync === true) {
            let options = {
                method: method,
                'url': apiUrl,
                headers: {
                    'zapiAccessKey': this.accessKey,
                    'Authorization': 'JWT ' + token,
                    'Content-Type': contentType
                },
                json: body
            };
        
            let result = this.getRequestPromise(false, options);
            return result;
        } else {
            let options = {
                headers: {
                    'zapiAccessKey': this.accessKey,
                    'Authorization': 'JWT ' + token,
                    'Content-Type': contentType
                },
                body: body
            }
    
            var res = syncRequest(method, apiUrl, options);
            return JSON.parse(res.getBody('utf8'));
        }
    }

    getRequestPromise(debug, params) {
        return new Promise(function(resolve, reject) {
            request(params, function(error, response, body) {
                if (error) return reject(error);
                if (debug) {
                    console.log(params);
                    console.log(body);
                }
                resolve(body);
            });
        }).catch(function(e) { console.log(`An error had occured with the api call: "${e}"`); });
    }

    getAllCycles(jiraProjectId, jiraProjectVersion) {
        return this.callZapiCloud(false, 'GET', `${this.cloudApiUrl}/cycles/search?expand=executionSummaries&projectId=${jiraProjectId}&versionId=${jiraProjectVersion}`, 'text/plain');
    }

    getAllExecutionsByIssue(issueId, jiraProjectId) {
        let offset = 0;
        let allExecutions = [];
        let executions = this.callZapiCloud(false, 'GET', `${this.cloudApiUrl}/executions?issueId=${issueId}&offset=${offset}&projectId=${jiraProjectId}`, 'text/plain')
        if (executions.totalCount > 0) {
            var totalCount = executions.totalCount;
            var maxAllowed = executions.maxAllowed;
            allExecutions = executions.executions;
        }

        for (offset = maxAllowed; offset < totalCount; offset += maxAllowed) {
            executions = this.callZapiCloud(false, 'GET', `${this.cloudApiUrl}/executions?issueId=${issueId}&offset=${offset}&projectId=${jiraProjectId}`, 'text/plain')
            allExecutions = allExecutions.concat(executions.executions);
        }

        return allExecutions
    }

    getAllExecutionsByIssueInVersion(issueId, versionId, jiraProjectId) {
        return this.getAllExecutionsByIssue(issueId, jiraProjectId).filter(e => e.execution.versionId == versionId);
    }

    updateExecution(executionId, cycleId, jiraProjectId, versionId, issueId, testStatus) {
        return this.callZapiCloud(true, 'PUT', `${this.cloudApiUrl}/execution/${executionId}`, 'application/json', { 'status': { 'id': testStatus }, 'projectId': jiraProjectId, 'issueId': issueId, 'cycleId': cycleId, 'versionId': versionId });
    }
}
© 2019 GitHub, Inc.
////////////////////