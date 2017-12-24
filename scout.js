var scout = {
	config: {
		urls: {
			apiRoot: '',
			sgvEntries: 'entries/sgv.json',
			deviceStatus: 'devicestatus.json',
			status: 'status.json',
			treatments: 'treatments.json'
		},
		sgv: {
			target_min: 80,
			target_max: 200
		},
		old_minutes: 8,
		timeFormat: 'MM/DD/YYYY HH:mm'
	}
};

scout.util = {
	colorForSgv: function(sgv) {
		if (sgv < scout.config.sgv.target_min) return 'rgb(255, 0, 0)';
		if (sgv > scout.config.sgv.target_max) return 'rgb(255, 0, 0)';
		return 'rgb(0, 255, 0)';
	},

	updateInRange: function(obj, sgv) {
		if (sgv < scout.config.sgv.target_min) obj.inRange[1]++;
		else if (sgv > scout.config.sgv.target_max) obj.inRange[3]++;
		else obj.inRange[2]++;
	},

	pctA1c: function(avg_sgv) {
		return (46.7 + avg_sgv)/28.7;
	},

	round: function(num, places) {
		return parseInt(num * Math.pow(10, places)) / Math.pow(10, places);
	},

	directionToArrow: function(dir) {
		return {
			/*
			NONE: '⇼', 
			DoubleUp: '⇈',
			SingleUp: '↑',
			FortyFiveUp: '↗',
			Flat: '→',
			FortyFiveDown: '↘',
			SingleDown: '↓',
			DoubleDown: '⇊',
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': '⇕'
			*/
			NONE: unescape('%u21FC'), 
			DoubleUp: unescape('%u21C8'),
			SingleUp: unescape('%u2191'),
			FortyFiveUp: unescape('%u2197'),
			Flat: unescape('%u2192'),
			FortyFiveDown: unescape('%u2198'),
			SingleDown: unescape('%u2193'),
			DoubleDown: unescape('%u21CA'),
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': unescape('%u21D5')
		}[dir];
	},

	directionToThickArrow: function(dir) {
		return {
			/*
			NONE: '⇼', 
			DoubleUp: '▲▲',
			SingleUp: '▲',
			FortyFiveUp: '⬈',
			Flat: '▶',
			FortyFiveDown: '⬊',
			SingleDown: '▼',
			DoubleDown: '▼▼',
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': '⬍'
			*/
			NONE: unescape('%u21FC'), 
			DoubleUp: unescape('%u25B2%u25B2'),
			SingleUp: unescape('%u25B2'),
			FortyFiveUp: unescape('%u2B08'),
			Flat: unescape('%u25B6'),
			FortyFiveDown: unescape('%u2B0A'),
			SingleDown: unescape('%u25BC'),
			DoubleDown: unescape('%u25BC%u25BC'),
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': unescape('%u2B0D')
		}[dir];
	},

	minsAgo: function(date) {
		var mom = moment(date).fromNow();
		if (mom == "a few seconds ago") return "just now";
		return mom;
	},

	noise: function(n) {
		return [
			'?',
			'✓',
			'⚠ LIGHT NOISE ⚠',
			'⚠ MODERATE NOISE ⚠',
			'⚠ HIGH NOISE ⚠'
		][parseInt(n)];
	},

	isOldData: function(date) {
		return moment.duration(moment().diff(date)).asMinutes() >= scout.config.old_minutes;
	},

	getShortTimeDiff: function(date) {
		var df = moment.duration(moment().diff(date));
		if (df.asMinutes() < 60) return Math.round(df.asMinutes())+"m";
		return parseInt(df.asHours())+"h";
	}
};

scout.chartConf = {
	sgv: {
		type: 'line',
		data: {
			labels: [// date
			],
			datasets: [{
				label: "Glucose",
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				borderColor: 'rgb(0, 0, 0)',
				fill: false,
				data: []
			}]
		},
		options: {
			// custom
			usePointBackgroundColor: true,

			responsive: true,
	        title: {
	            text: "Glucose"
	        },
			scales: {
				xAxes: [{
					type: "time",
					time: {
						format: scout.config.timeFormat,
						//unit: 'hour',
						//unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a',
							'day': 'MMM D'
						},
						// round: 'day'
						tooltipFormat: 'MMM D hh:mm a'
					},
					scaleLabel: {
						display: false,
						labelString: 'Date'
					}
				}, ],
				yAxes: [{
					scaleLabel: {
						display: false,
						labelString: 'mg/dL'
					},
					ticks: {
						suggestedMin: 40,
						suggestedMax: 280,
						stepSize: 40

					}
				}],
			},
			legend: {
				display: false
			},
			annotation: {
				events: [],
				annotations: [
				{
					drawTime: "beforeDatasetsDraw",
					id: "lowRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: 0,
					yMax: scout.config.sgv.target_min,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 0, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "highRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_max,
					yMax: 400,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 127, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "goodRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_min,
					yMax: scout.config.sgv.target_max,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(0, 255, 0, 0.1)",
					borderColor: "rgba(0, 255, 0, 1)",
					borderWidth: 2
				}]
			}
		},
	},

	bg: {
		type: 'doughnut',
	    data: {
			labels: ["Unknown", "Low", "In Range", "High"],
			datasets: [{
				label: "mg/dL",
				backgroundColor: [
					"rgb(169, 169, 169)",
					"rgb(128, 0, 0)",
					"rgb(0, 255, 0)",
					"rgb(255, 127, 0)"
				],
			  	data: []
			}]
	    },
	    options: {
	    	responsive: true,
			title: {
				display: false,
				text: 'Current Blood Glucose'
			},
			legend: {
				display: false
			},
	      	annotation: {
				events: [],
				annotations: [{
					drawTime: "beforeDatasetsDraw",
					id: "bgCurrent",
					type: "text",
					yMin: 0,
					yMax: scout.config.sgv.target_min,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 0, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "highRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_max,
					yMax: 400,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 127, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "goodRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_min,
					yMax: scout.config.sgv.target_max,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(0, 255, 0, 0.1)",
					borderColor: "rgba(0, 255, 0, 1)",
					borderWidth: 2
				}]
			}
	    }
	}
};

scout.chart = {
	sgv: null,
	bg: null
};

scout.inRange = {
	initOnce: false,
	init: function() {
		if (scout.inRange.initOnce) return;
		scout.inRange.initOnce = true;
		scout.inRange.addRange("2017-12-01", "2017-12-20");
		scout.inRange.addDay("2017-12-01");
		scout.inRange.addDay("2017-12-05");
		scout.inRange.addDay("2017-11-10");
	},

	addDay: function(date) {
		scout.fetch.eq(date, function(data) {
			scout.inRange.embedSingle(data, [date]);
		});
	},

	addRange: function(st_date, end_date) {
		scout.fetch.range(st_date, end_date, function(data) {
			scout.inRange.embedSingle(data, [st_date, end_date]);
		});
	},

	embedSingle: function(data, dates) {
		console.debug("embed data", data);
		var outer = document.querySelector("#in_range");
		var tpl = document.querySelector("script#in_range_tpl");
		var id = Math.random().toString(36).substring(2);
		var html = tpl.innerHTML
			.replace(/\{id\}/g, id)
			.replace(/\{date\}/g, dates.join("--"));
		var dict = scout.inRange.dataDict(data, id, dates);
		for (var key in dict) {
			html = html.replace(new RegExp("\\{" + key + "\\}", "g"), dict[key]);
		}
		var newDiv = document.createElement("div");
		newDiv.innerHTML = html;
		outer.appendChild(newDiv.children[0]);
		scout.bg.load("in_range_canvas_"+id, data);
		scout.sgv.load("in_range_sgv_canvas_"+id, data, {tooltips: true, thinLines: true});
	},

	dataDict: function(data, id, dates) {
		var dict = {};
		var chartData = scout.bg.genChartData(data);

		if (dates.length == 1) {
			dict['header_date'] = moment(dates[0]).format("MMMM Do, YYYY");
		} else {
			dict['header_date'] = moment(dates[0]).format("MMMM Do")+" - "+moment(dates[1]).format("MMMM Do, YYYY");
		}

		var inRangePct = chartData.inRange[2]/chartData.bgCount
		var avgBg = chartData.bgSum/chartData.bgCount

		var stats = "In range: "+scout.util.round(inRangePct, 4)*100+"%<br>" +
					"Average BG: "+scout.util.round(avgBg, 0)+" ("+scout.util.round(scout.util.pctA1c(avgBg), 2)+"%A1c)<br>"+
					"Total entries: "+chartData.bgCount;
		dict['stats'] = stats;

		return dict;
	}
};

scout.bg = {
	init: function(canvasId) {
		var bgCtx = document.getElementById(canvasId).getContext("2d");
		// hack for deep clone. we don't want to store data in chartConf.
		var bgConf = JSON.parse(JSON.stringify(scout.chartConf.bg));
		return new Chart(bgCtx, bgConf);
	},

	genChartData: function(data) {
		var dat = {
			inRange: [0, 0, 0, 0],
			bgSum: 0,
			bgCount: 0
		};
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			scout.util.updateInRange(dat, obj['sgv']);
			dat.bgSum += obj['sgv'];
			dat.bgCount++;
		}
		console.log("chartD", dat);
		return dat;
	},

	render: function(chart, chartData) {
		var bgSet = chart.config.data.datasets[0];
		bgSet.data = [];
		for (var i=0; i<chartData.inRange.length; i++) {
			bgSet.data.push(chartData.inRange[i]);
		}
		var middleText = scout.util.round(chartData.inRange[2]/chartData.bgCount, 2)*100+'%';
		// scout.util.round(chartData.bgSum/chartData.bgCount, 0);
		//displayedData[0]['sgv'] +' ' +directionToArrow(displayedData[0]['direction'])
		chart.config.options['elements']['center'] = {
			maxText: '100%',
			text: middleText,
			fontColor: 'rgb(0, 0, 0)'
		};
		chart.update();
	},

	load: function(canvasId, data) {
		var chart = scout.bg.init(canvasId);
		scout.bg.render(chart, scout.bg.genChartData(data));
		chart.update();
		return chart;
	}
};

scout.sgv = {
	primaryInit: function() {
		scout.chart.sgv = scout.sgv.init("sgvCanvas");
		scout.sgv.bindJump();
	},

	init: function(canvasId, extraConf) {
		var sgvCtx = document.getElementById(canvasId).getContext("2d");
		// single-layer copy. can't use full deep copy due to moment()
		var sgvConf = Object.assign({}, scout.chartConf.sgv);

		if (extraConf) {
			sgvConf['options']['tooltips'] = {enabled: extraConf['tooltips']};
			sgvConf['options']['usePointBackgroundColor'] = extraConf['usePointBackgroundColor'];
			if (extraConf['thinLines']) {
				sgvConf['data']['datasets'][0]['borderWidth'] = 2;
				sgvConf['options']['elements'] = {point: {radius: 0}};
			}
		}

		// hack for deep copy of data fields.
		sgvConf.data = JSON.parse(JSON.stringify(scout.chartConf.sgv.data));
		return new Chart(sgvCtx, sgvConf);
	},

	bindJump: function() {
		function click(cb) {
			return function() {
				this.parentElement.querySelector(".is-active").classList.remove('is-active');
				this.classList.add('is-active');
				scout.sgv.currentLength = cb;
				cb(scout.sgv.primaryCallback);
			}
		}
		document.querySelector("#sgv-jump-halfday").addEventListener('click', click(scout.fetch.halfday));
		document.querySelector("#sgv-jump-today").addEventListener('click', click(scout.fetch.today));
		document.querySelector("#sgv-jump-threeday").addEventListener('click', click(scout.fetch.threeday));
		document.querySelector("#sgv-jump-week").addEventListener('click', click(scout.fetch.week));
	},

	primaryCallback: function(data) {
		return scout.sgv.callback(scout.chart.sgv, data);
	},

	callback: function(chart, data) {
		if (chart === scout.chart.sgv) {
			console.log("isSGVchart");
			scout.current.currentEntry = data[0];
			scout.current.loadSgv();
		}
		console.log(data);
		var ldata = [];
		var dataset = chart.config.data.datasets[0];
		dataset.data = [];
		if (chart.options.usePointBackgroundColor) dataset.pointBackgroundColor = [];
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			dataset.data.push({
				x: moment(obj['dateString']),
				y: obj['sgv']
			});
			if (chart.options.usePointBackgroundColor) {
				dataset.pointBackgroundColor.push(scout.util.colorForSgv(obj['sgv']))
			}
		}
		
		console.log(ldata);
		chart.update();
	},


	load: function(canvasId, data, extraConf) {
		var chart = scout.sgv.init(canvasId, extraConf);
		scout.sgv.callback(chart, data);
		chart.update();
		return chart;
	}
};

scout.current = {
	currentEntry: null,
	loadSgv: function() {
		var cur = scout.current.currentEntry;
		if (!cur) return;

		var sgvText = cur['sgv'];
		var direction = scout.util.directionToArrow(cur['direction']);
		var delta = cur['delta'] > 0 ? '+'+scout.util.round(cur['delta'], 1) : scout.util.round(cur['delta'], 1);
		var noise = scout.util.noise(cur['noise']);

		if (scout.util.isOldData(cur['date'])) {
			direction = "old";
			document.querySelector("#current_sgv").classList.add('old-data');
			document.querySelector("#current_minsago").classList.add('old-data');
		} else {
			document.querySelector("#current_sgv").classList.remove('old-data');
			document.querySelector("#current_minsago").classList.remove('old-data');
		}

		document.querySelector("#current_sgv").innerHTML = sgvText;
		document.querySelector("#current_sgv").style.color = scout.util.colorForSgv(cur['sgv']);
		document.querySelector("#current_direction").innerHTML = direction;
		document.querySelector("#current_delta").innerHTML = delta;
		document.querySelector("#current_minsago").innerHTML = scout.util.minsAgo(cur['date']);
		document.querySelector("#current_noise").innerHTML = noise;

		var title = cur['sgv']+''+direction+' '+delta+' '+noise+' - scout';
		var tobj = document.querySelector("title");
		if (tobj.innerHTML != title) tobj.innerHTML = title;
		scout.current.updateFavicon(cur);
		scout.current.notify(cur);
	},

	updateFavicon: function(cur) {
		var link = document.querySelector("link[rel='icon']");
		link.setAttribute('type', 'image/png');
		link.setAttribute('href', scout.current.buildBgIcon(cur));
	},

	buildBgIcon: function(cur) {
		var sgv = parseInt(cur['sgv']);
		var arrow = scout.util.directionToThickArrow(cur['direction']);
		var noise = scout.util.noise(cur['noise']);
		if (noise.length > 1) arrow = noise.substring(0, 1);
		var canvas = document.getElementById("favicon_canvas");
		
		
		with (canvas.getContext("2d")) {
			clearRect(0, 0, canvas.width, canvas.height);
			if (scout.util.isOldData(cur['date'])) {
				var tline = "old";
				var tdiff = scout.util.getShortTimeDiff(cur['date']);
				fillStyle = "rgb(255,255,255)";
				fillRect(0, 0, 64, 64);

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				font = "40px Arial";
				fillText(tline, 32, 30);

				font = "30px Arial";
				fillText(tdiff, 32, 63);
			} else {
				fillStyle = scout.util.colorForSgv(sgv);
				fillRect(0, 0, 64, 64);

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				font = "bold 40px Arial";
				fillText(arrow, 32, 30);

				font = "40px Arial";
				fillText(sgv, 32, 63);
			}
		}
		return canvas.toDataURL("image/png");
	},

	shouldNotify: function(cur) {
		return (cur['noise'] > 1 || cur['sgv'] < scout.config.sgv.target_min || cur['sgv'] > scout.config.sgv.target_max) && (cur != scout.current.nflast);
	},

	nfobj: null,
	nflast: null,

	notify: function(cur, force) {
		if (!("Notification" in window)) return;
		if (Notification.permission == "granted") {

			if (scout.current.shouldNotify(cur) || !!force) {
				scout.current.nflast = cur;
				var direction = scout.util.directionToArrow(cur['direction']);
				var delta = cur['delta'] > 0 ? '+'+scout.util.round(cur['delta'], 1) : scout.util.round(cur['delta'], 1);
				var noise = scout.util.noise(cur['noise']);

				var text = "BG level is "+cur['sgv']+""+direction;
				var body = "Delta: "+delta+"  Noise: "+noise;
				var bgIcon = scout.current.buildBgIcon(cur);
				var options = {
					body: body,
					icon: bgIcon,
					badge: bgIcon,
					tag: "scout-notify"
				}
				if (scout.current.nfobj) scout.current.nfobj.close();
				scout.current.nfobj = new Notification(text, options);
				scout.current.nfobj.onclick = function(event) {
					window.focus();
					document.body.focus();
					this.close();
				}
				return scout.current.nfobj;
			}
		} else if (Notification.permission != "denied") {
			Notification.requestPermission(function(permission) {
				if (permission == "granted") scout.current.notify(cur);
			});
		}
	}
};

scout.fetch = function(args, cb) {
	superagent.get(scout.config.urls.apiRoot + scout.config.urls.sgvEntries+"?"+args, function(resp) {
		var data = JSON.parse(resp.text);
		cb(data);

	});
}

scout.fetch.gte = function(fmt, cb) {
	return scout.fetch("find[dateString][$gte]="+fmt+"&count=9999", cb);
}

scout.fetch.range = function(st, end, cb) {
	return scout.fetch("find[dateString][$gte]="+st+"&find[dateString][$lte]="+end+"&count=9999", cb);
}

scout.fetch.eq = function(fmt, cb) {
	return scout.fetch.range(fmt, moment(fmt).add({hours: 24}).format(), cb);
}

scout.fetch.halfday = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 12}).format(), cb);
}

scout.fetch.today = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 24}).format(), cb);
}

scout.fetch.threeday = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 72}).format(), cb);
}

scout.fetch.week = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 168}).format(), cb);
}

scout.device = {
	fetchStatus: function(cb) {
		superagent.get(scout.config.urls.apiRoot + scout.config.urls.deviceStatus, function(resp) {
			var data = JSON.parse(resp.text);
			cb(data);
		});
	},

	fetchTreatments: function(args, cb) {
		superagent.get(scout.config.urls.apiRoot + scout.config.urls.treatments + "?" + args, function(resp) {
			var data = JSON.parse(resp.text);
			cb(data);
		});
	},

	fetchSensorStart: function(cb) {
		scout.device.fetchTreatments("count=1&find[created_at][$gte]=2017&find[eventType]=Sensor+Start", cb);
	},


	update: function() {
		scout.device.fetchStatus(function(data) {
			var latest = data[0];
			console.log("latest", latest);
			document.querySelector("#device_battery").innerHTML = latest["uploader"]["battery"];
			document.querySelector("#device_name").innerHTML = latest["device"];
		});

		scout.device.fetchSensorStart(function(data) {
			var latest = data[0];
			console.log("sensorStart", latest);
			document.querySelector("#cgm_sensor_age").innerHTML = moment(latest["created_at"]).fromNow();
		});
	}
};

Chart.defaults.global.animation.duration = 250;
Chart.pluginService.register({
	afterUpdate: function (chart) {
		if (chart.config.options.elements.center) {
			var helpers = Chart.helpers;
			var centerConfig = chart.config.options.elements.center;
			var globalConfig = Chart.defaults.global;
			var ctx = chart.chart.ctx;

			var fontStyle = helpers.getValueOrDefault(centerConfig.fontStyle, globalConfig.defaultFontStyle);
			var fontFamily = helpers.getValueOrDefault(centerConfig.fontFamily, globalConfig.defaultFontFamily);

			if (centerConfig.fontSize)
				var fontSize = centerConfig.fontSize;
			// figure out the best font size, if one is not specified
			else {
				ctx.save();
				var fontSize = helpers.getValueOrDefault(centerConfig.minFontSize, 1);
				var maxFontSize = helpers.getValueOrDefault(centerConfig.maxFontSize, 256);
				var maxText = helpers.getValueOrDefault(centerConfig.maxText, centerConfig.text);

				do {
					ctx.font = helpers.fontString(fontSize, fontStyle, fontFamily);
					var textWidth = ctx.measureText(maxText).width;

					// check if it fits, is within configured limits and that we are not simply toggling back and forth
					if (textWidth < chart.innerRadius * 2 && fontSize < maxFontSize)
						fontSize += 1;
					else {
						// reverse last step
						fontSize -= 1;
						break;
					}
				} while (true)
				ctx.restore();
			}

			// save properties
			chart.center = {
				font: helpers.fontString(fontSize, fontStyle, fontFamily),
				fillStyle: helpers.getValueOrDefault(centerConfig.fontColor, globalConfig.defaultFontColor)
			};
		}
	},
	afterDraw: function (chart) {
		if (chart.center) {
			var centerConfig = chart.config.options.elements.center;
			var ctx = chart.chart.ctx;

			ctx.save();
			ctx.font = chart.center.font;
			ctx.fillStyle = chart.center.fillStyle;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			var centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
			var centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
			ctx.fillText(centerConfig.text, centerX, centerY);
			ctx.restore();
		}
	},
});

window.onload = function() {
	scout.sgv.primaryInit();
	scout.sgv.currentLength = scout.fetch.halfday;
	scout.sgv.currentLength(scout.sgv.primaryCallback);
	setInterval(function() {
		console.log("reload", scout.sgv.currentLength);
		scout.sgv.currentLength(scout.sgv.primaryCallback);
	}, 30*1000);
	scout.device.update();
	
};
