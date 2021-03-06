/*
Copyright (C) 2014 Yahoo! Inc. All Rights Reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.
3. All advertising materials mentioning features or use of this software
   must display the following acknowledgement:
   This product includes software developed by the Yahoo! Inc..
4. Neither the name of the Yahoo! Inc. nor the
   names of its contributors may be used to endorse or promote products
   derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY YAHOO! INC. ''AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL YAHOO! INC. BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Author: Nera Liu <neraliu@yahoo-inc.com>
*/
phantom.injectJs("common-lib.js");

var system = require('system');
var fs = require('fs');

var starttime = new Date().getTime();

var links;
var debug = 0;
var cookiesfile = "";
var timeout = 5000;
var level = 0;
var url = "http://devel-001.fe-ver.com/domxss/index001.html#<script>alert(1)</script>";
var renderpath = "./";
// var url = "http://devel-001.fe-ver.com/domxss/index002.html";
// var url = "http://crackschool.exploited360.com:8998/index.php?name=ds%3Cimg%20src=0%20onerror=alert%28%22welcome!%22%29%3E";
// var url = "http://ads.yimg.com/ja/a/ysm/hk/kplus/kplus_south.html";
if (system.args.length < 2) {
	console.log("Usage: domxss.js [url] [cookies file in mozilla format] [debug:1|0] [timeout] [rendering path]");
} else {
	url = system.args[1];
	if (system.args.length == 3) {
		cookiesfile = system.args[2];
	} else if (system.args.length == 4) {
		cookiesfile = system.args[2];
		debug = system.args[3];
	} else if (system.args.length == 5) {
		cookiesfile = system.args[2];
		debug = system.args[3];
		timeout = system.args[4];
	} else if (system.args.length == 6) {
		cookiesfile = system.args[2];
		debug = system.args[3];
		timeout = system.args[4];
		renderpath = system.args[5];
	}
}
console.log("TAINTED PHANTOMJS: ---------- tainted-phantomjs ----------");
console.log("TAINTED PHANTOMJS: opening url: " + url);
console.log("TAINTED PHANTOMJS: cookies file: " + cookiesfile);
console.log("TAINTED PHANTOMJS: debug: " + debug);
console.log("TAINTED PHANTOMJS: timeout: " + timeout);
console.log("");

/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
	var checktimeout = 250;
	var maxtimeOutMillis = timeOutMillis ? timeOutMillis : timeout, //< Default Max Timout is 3s
		start = new Date().getTime(),
		condition = false,
		interval = setInterval(function() {
			if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
			// If not time-out yet and condition not yet fulfilled
				condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
			} else {
				if (!condition) {
					// If condition still not fulfilled (timeout but condition is 'false')
					// console.log("'waitFor()' timeout");
					// force to return
					condition = true;
				} else {
					// Condition fulfilled (timeout and/or condition is 'true')
					// console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
					typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
					clearInterval(interval); //< Stop this interval
                		}
            		}
		}, checktimeout); //< repeat check every 250ms
}

function test_domxss(url, timeout, debug, l) {
	var page = require('webpage').create();
	// page.navigationLocked = true;
	var no_of_navigation = 0;

	page.open(url, function (status) {
		if (status !== 'success') {
			console.log('TAINTED PHANTOMJS: Unable to access network');
		}
	});

	page.onConsoleMessage = function(msg, lineNum, sourceId) {
		console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
	};

	page.onError = function(msg, trace) {
		var msgStack = ['ERROR: ' + msg];
		if (trace) {
			msgStack.push('TRACE:');
			trace.forEach(function(t) {
				msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
			});
		}
		console.error(msgStack.join('\n'));
	};

	page.onInitialized = function() {
		page.evaluate(function() {
			document.addEventListener('DOMContentLoaded', function() {
				console.log('TAINTED PHANTOMJS: DOM content has loaded.');
			}, false);
		});
	};

	page.onLoadFinished = function(status) {
		if (status !== 'success') {
			console.log('TAINTED PHANTOMJS: Unable to access network');
		} else {
			page.injectJs('jquery-1.9.1.min.js');
			page.injectJs('x2js-v1.0.11/xml2json.js');

			// Wait for 'signin-dropdown' to be visible
			waitFor(function() {
				return page.evaluate(function() {
					return false; // $("#domxss").is(":visible");
				});
			}, function() {
				page.evaluate(function() {
				});

				var tainted = page.evaluate(function () {
					var tainted = false;
					if (document.tainted) tainted = true;
					var allobj = $("*");
					for(var i=0;i<allobj.length;++i) {
						if (allobj[i].tainted) {
							console.log("TAINTED PHANTOMJS: " + allobj[i] + " id:" + allobj[i].id + " tainted:" + allobj[i].tainted);
                                                        /*
                                                        for(var j in allobj[i]) {
                                                                console.log("TAINTED PHANTOMJS: " + j + "," + allobj[i][j]);
                                                        }
                                                        */
                                                        tainted = true;
                                                }
                                        }
					if (tainted) {
						console.log("TAINTED PHANTOMJS XML: " + document.taintedMessage);
						var sinks = new Array();
						var sources = new Array();

						var x2js = new X2JS();
						var jsResult = x2js.xml_str2json('<result>'+document.taintedMessage+'</result>');
						for (var index in jsResult.result.trace) {
							var s = jsResult.result.trace[index];
							// console.log("TAINTED PHANTOMJS XML: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc);
							if (s.action == "source") sources.push(index);
							if (s.action == "sink") sinks.push(index);
						}
						console.log("TAINTED PHANTOMJS XML: =================");
						for (var i=0;i<sources.length;++i) {
							var s = jsResult.result.trace[sources[i]];
							console.log("TAINTED PHANTOMJS XML: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc+","+s.value);
						}
						console.log("TAINTED PHANTOMJS XML: =================");
						for (var i=0;i<sinks.length;++i) {
							var s = jsResult.result.trace[sinks[i]];
							console.log("TAINTED PHANTOMJS XML: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc+","+s.value);
						}
						console.log("");
					}
					if (tainted) {
						console.log("TAINTED PHANTOMJS TRACE: " + document.taintedTrace);
						var sinks = new Array();
						var sources = new Array();
						var propagates = new Array();
						var clears = new Array();
						var resets = new Array();

						var x2js = new X2JS();
						var jsResult = x2js.xml_str2json('<result>'+document.taintedTrace+'</result>');
						var lastindex = 0;
						for (var index in jsResult.result.trace) {
							var s = jsResult.result.trace[index];
							// console.log("TAINTED PHANTOMJS TRACE: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc);
							if (s.action == "source") sources.push(index);
							if (s.action == "sink") sinks.push(index);
							if (s.action == "propagate") propagates.push(index);
							if (s.action == "clears") clears.push(index);
							if (s.action == "resets") resets.push(index);
							lastindex = index;
						}
						console.log("TAINTED PHANTOMJS TRACE: =================");
						for (var i=0;i<sources.length;++i) {
							var s = jsResult.result.trace[sources[i]];
							console.log("TAINTED PHANTOMJS TRACE: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc+","+s.value);
						}
						console.log("TAINTED PHANTOMJS TRACE: =================");
						for (var i=0;i<sinks.length;++i) {
							var s = jsResult.result.trace[sinks[i]];
							console.log("TAINTED PHANTOMJS TRACE: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc+","+s.value);
						}
						console.log("TAINTED PHANTOMJS TRACE: =================");
						for (var i=0;i<propagates.length;++i) {
							var s = jsResult.result.trace[propagates[i]];
							console.log("TAINTED PHANTOMJS TRACE: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc+","+s.value);
						}
						console.log("TAINTED PHANTOMJS TRACE: =================");
						for (var i=0;i<clears.length;++i) {
							var s = jsResult.result.trace[clears[i]];
							console.log("TAINTED PHANTOMJS TRACE: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc+","+s.value);
						}
						console.log("TAINTED PHANTOMJS TRACE: =================");
						for (var i=0;i<resets.length;++i) {
							var s = jsResult.result.trace[resets[i]];
							console.log("TAINTED PHANTOMJS TRACE: "+s.action+","+s.taintedno+","+s.internalfunc+","+s.jsfunc+","+s.value);
						}
						console.log("");
					}
					return tainted;
				});
				if (debug == 1) {
					var body = page.evaluate(function () {
						return document.body.innerHTML;
					});
					console.log("TAINTED PHANTOMJS: " + body);
				}
		        	console.log("");
				console.log("TAINTED PHANTOMJS: ---------- result ----------");
				console.log("TAINTED PHANTOMJS: document tainted? " + tainted);
				console.log("TAINTED PHANTOMJS: ---------- result ----------");
				page.render(renderpath + 'screenshot.png');
				phantom.exit();
			});
		}
	};

	page.onLoadStarted = function() {
		var currentUrl = page.evaluate(function() {
			return window.location.href;
		});
		console.log("TAINTED PHANTOMJS: ---------- tainted-phantomjs ----------");
		console.log('TAINTED PHANTOMJS: Current page ' + currentUrl +' will gone...');
		console.log('TAINTED PHANTOMJS: Now loading a new page...');
	};

	page.onNavigationRequested = function(url, type, willNavigate, main) {
		++no_of_navigation;
		if (no_of_navigation >= 10) {
			console.log("");
			console.log("TAINTED PHANTOMJS: ---------- result ----------");
			console.log("TAINTED PHANTOMJS: document tainted? unknown");
			console.log("TAINTED PHANTOMJS: ---------- result ----------");
		}
		console.log('TAINTED PHANTOMJS: Trying to navigate to: ' + url);
		console.log('TAINTED PHANTOMJS: Caused by: ' + type);
		console.log('TAINTED PHANTOMJS: Will actually navigate: ' + willNavigate);
	};

	page.onPageCreated = function(newPage) {
		console.log('TAINTED PHANTOMJS: A new child page was created! Its requested URL is not yet available, though.');
		// Decorate
		newPage.onClosing = function(closingPage) {
			console.log('TAINTED PHANTOMJS: A child page is closing: ' + closingPage.url);
		};
	};

	page.onPrompt = function(msg, defaultVal) {
		if (msg === "What's your name?") {
			return 'PhantomJS';
		}
		return defaultVal;
	};

	page.onResourceRequested = function(request) {
		if (debug == 1) {
			console.log('TAINTED PHANTOMJS: Request (#' + request.id + '): ' + JSON.stringify(request));
		}
	};

	page.onResourceReceived = function(response) {
		if (debug == 1) {
			console.log('TAINTED PHANTOMJS: Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response));
		}
	};

	page.onUrlChanged = function(targetUrl) {
		console.log('TAINTED PHANTOMJS: New URL: ' + targetUrl);
	};

	return false;
}

phantom.cookiesEnabled = true;
cookie_parser(cookiesfile, debug);
test_domxss(url, timeout, debug, level);
