var scout = {
	config: {
		fetchUrl: 'test-data.json',
		sgv: {
			target_min: 80,
			target_max: 200
		},
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

	minsAgo: function(date) {
		var now = new Date();
		var mins = parseInt((now - date)/60000);
		if (mins < 1) return "just now";
		if (mins == 1) return "1 min ago";
		return mins+" mins ago";
	},

	noise: function(n) {
		return [
			'?',
			'✓',
			'⚠ LIGHT NOISE ⚠',
			'⚠ MODERATE NOISE ⚠',
			'⚠ HIGH NOISE ⚠'
		][parseInt(n)];
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
			responsive: true,
	        title: {
	            text: "Glucose"
	        },
			scales: {
				xAxes: [{
					type: "time",
					time: {
						format: scout.config.timeFormat,
						unit: 'hour',
						unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a',
							'day': 'll'
						},
						// round: 'day'
						tooltipFormat: 'll hh:mm a'
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
	init: function() {
		scout.inRange.add("2017-12-22");
		scout.inRange.add("2017-12-21");
		scout.inRange.add("2017-12-20");
	},

	add: function(date) {
		scout.fetch.eq(date, function(data) {
			console.debug("eq data", data);
			var outer = document.querySelector("#in_range");
			var tpl = document.querySelector("script#in_range_tpl");
			var id = Math.random().toString(36).substring(2);
			var html = tpl.innerHTML
				.replace(/\{id\}/g, id)
				.replace(/\{date\}/g, date);
			var dict = scout.inRange.dataDict(data, id, date);
			for (var key in dict) {
				html = html.replace(new RegExp("\\{" + key + "\\}", "g"), dict[key]);
			}
			var newDiv = document.createElement("div");
			newDiv.innerHTML = html;
			outer.appendChild(newDiv.children[0]);
			scout.bg.load("in_range_canvas_"+id, data);
			
		});
	},

	dataDict: function(data, id, date) {
		var dict = {};
		var chartData = scout.bg.genChartData(data);

		dict['header_date'] = moment(date).format("MMMM Do, YYYY");

		var stats = "In range: "+scout.util.round(chartData.inRange[2]/chartData.bgCount, 4)*100+"%<br>" +
					"Average BG: "+scout.util.round(chartData.bgSum/chartData.bgCount, 0);
		dict['stats'] = stats;

		return dict;
	}
};

scout.bg = {
	init: function(canvasId) {
		var bgCtx = document.getElementById(canvasId).getContext("2d");
		var bgConf = Object.assign({}, scout.chartConf.bg);
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
	}
};

scout.sgv = {
	data: null,
	currentEntry: null,
	inRange: null,
	bgSum: 0,
	bgCount: 0,

	init: function() {
		var sgvCtx = document.getElementById("sgvCanvas").getContext("2d");
		scout.chart.sgv = new Chart(sgvCtx, scout.chartConf.sgv);

		scout.sgv.bindJump();
	},

	bindJump: function() {
		function click(cb) {
			return function() {
				this.parentElement.querySelector(".is-active").classList.remove('is-active');
				this.classList.add('is-active');
				cb(scout.sgv.callback);
			}
		}
		document.querySelector("#sgv-jump-halfday").addEventListener('click', click(scout.fetch.halfday));
		document.querySelector("#sgv-jump-today").addEventListener('click', click(scout.fetch.today));
		document.querySelector("#sgv-jump-threeday").addEventListener('click', click(scout.fetch.threeday));
		document.querySelector("#sgv-jump-week").addEventListener('click', click(scout.fetch.week));
	},


	callback: function(data) {
		scout.sgv.currentEntry = data[0];
		scout.current.loadSgv();
		console.log(data);
		var ldata = [];
		var dataset = scout.chart.sgv.config.data.datasets[0];
		dataset.data = [];
		dataset.pointBackgroundColor = [];
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			if (!(obj in scout.sgv.data)) {
				dataset.data.push({
					x: moment(obj['dateString']),
					y: obj['sgv']
				});
				//scout.util.updateInRange(obj['sgv']);
				window.scout.sgv.bgSum += obj['sgv'];
				window.scout.sgv.bgCount++;
			}
			scout.sgv.data.push(obj);
			dataset.pointBackgroundColor.push(scout.util.colorForSgv(obj['sgv']))
		}
		
		console.log(ldata);
		scout.chart.sgv.update();
	}
};

scout.current = {
	loadSgv: function() {
		var cur = scout.sgv.currentEntry;
		if (!cur) return;

		var direction = scout.util.directionToArrow(cur['direction']);
		var delta = cur['delta'] > 0 ? '+'+Math.round(cur['delta']) : Math.round(cur['delta']);
		var noise = scout.util.noise(cur['noise']);

		document.querySelector("#current_sgv").innerHTML = cur['sgv'];
		document.querySelector("#current_sgv").style.color = scout.util.colorForSgv(cur['sgv']);
		document.querySelector("#current_direction").innerHTML = direction;
		document.querySelector("#current_delta").innerHTML = delta;
		document.querySelector("#current_minsago").innerHTML = scout.util.minsAgo(cur['date']);
		document.querySelector("#current_noise").innerHTML = noise;

		document.querySelector("title").innerHTML = cur['sgv']+''+direction+' '+delta+' '+noise+' - scout';
	}
};

scout.fetch = function(args, cb) {
	scout.sgv.data = [];
	scout.sgv.inRange = [0, 0, 0, 0];
	scout.sgv.bgSum = 0;
	scout.sgv.bgCount = 0;
	superagent.get(scout.config.fetchUrl+"?"+args, function(resp) {
		var data = JSON.parse(resp.text);
		cb(data);

	});
}

scout.fetch.gte = function(fmt, cb) {
	return scout.fetch("find[dateString][$gte]="+fmt+"&count=9999", cb);
}

scout.fetch.eq = function(fmt, cb) {
	return scout.fetch("find[dateString][$gte]="+fmt+"&find[dateString][$lt]="+moment(fmt).add({hours: 24}).format()+"&count=9999", cb);
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
	scout.sgv.init();
	scout.fetch.halfday(scout.sgv.callback);
	
};
