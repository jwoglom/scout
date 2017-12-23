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

	updateInRange: function(sgv) {
		if (sgv < scout.config.sgv.target_min) window.scout.sgv.inRange[1]++;
		else if (sgv > scout.config.sgv.target_max) window.scout.sgv.inRange[3]++;
		else window.scout.sgv.inRange[2]++;
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

scout.sgv = {
	data: null,
	currentEntry: null,
	inRange: null,
	bgSum: 0,
	bgCount: 0,

	bindJump: function() {
		function click(cb) {
			return function() {
				this.parentElement.querySelector(".is-active").classList.remove('is-active');
				this.classList.add('is-active');
				cb();
			}
		}
		document.querySelector("#sgv-jump-halfday").addEventListener('click', click(scout.fetch.halfday));
		document.querySelector("#sgv-jump-today").addEventListener('click', click(scout.fetch.today));
		document.querySelector("#sgv-jump-threeday").addEventListener('click', click(scout.fetch.threeday));
		document.querySelector("#sgv-jump-week").addEventListener('click', click(scout.fetch.week));
	}
};

scout.current = {
	loadSgv: function() {
		var cur = scout.sgv.currentEntry;
		if (!cur) return;

		document.querySelector("#current_sgv").innerHTML = cur['sgv'];
		document.querySelector("#current_direction").innerHTML = scout.util.directionToArrow(cur['direction']);
		document.querySelector("#current_delta").innerHTML = cur['delta'] > 0 ? '+'+Math.round(cur['delta']) : Math.round(cur['delta']);
		document.querySelector("#current_minsago").innerHTML = scout.util.minsAgo(cur['date']);
	}
};

scout.fetch = function(args) {
	scout.sgv.data = [];
	scout.sgv.inRange = [0, 0, 0, 0];
	scout.sgv.bgSum = 0;
	scout.sgv.bgCount = 0;
	superagent.get(scout.config.fetchUrl+"?"+args, function(resp) {
		var data = JSON.parse(resp.text);
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
				scout.util.updateInRange(obj['sgv']);
				window.scout.sgv.bgSum += obj['sgv'];
				window.scout.sgv.bgCount++;
			}
			scout.sgv.data.push(obj);
			dataset.pointBackgroundColor.push(scout.util.colorForSgv(obj['sgv']))
		}
		
		console.log(ldata);
		scout.chart.sgv.update();

		var bgSet = scout.chart.bg.config.data.datasets[0];
		bgSet.data = [];
		for (var i=0; i<scout.sgv.inRange.length; i++) {
			bgSet.data.push(scout.sgv.inRange[i]);
		}
		scout.chart.bg.config.data['middleText'] = scout.util.round(window.scout.sgv.bgSum/window.scout.sgv.bgCount, 0);
		//displayedData[0]['sgv'] +' ' +directionToArrow(displayedData[0]['direction'])
		scout.chart.bg.update();

	});
}

scout.fetch.gte = function(fmt) {
	return scout.fetch("find[dateString][$gte]="+fmt+"&count=9999");
}

scout.fetch.halfday = function() {
	return scout.fetch.gte(moment().subtract({hours: 12}).format());
}

scout.fetch.today = function() {
	return scout.fetch.gte(moment().subtract({hours: 24}).format());
}

scout.fetch.threeday = function() {
	return scout.fetch.gte(moment().subtract({hours: 72}).format());
}

scout.fetch.week = function() {
	return scout.fetch.gte(moment().subtract({hours: 168}).format());
}

Chart.pluginService.register({
  beforeDraw: function(chart) {
    var width = chart.chart.width,
        height = chart.chart.height,
        ctx = chart.chart.ctx;

    ctx.restore();
    if (chart.config.type != 'doughnut') return;
    var fontSize = (height / 114).toFixed(2);
    ctx.font = fontSize + "em sans-serif";
    ctx.textBaseline = "middle";

    if ('middleText' in chart.config.data) {
	    var text = chart.config.data['middleText'],
	        textX = Math.round((width - ctx.measureText(text).width) / 2),
	        textY = height / 2;

	    ctx.fillText(text, textX, textY);
	    ctx.save();
	}
  }
});

window.onload = function() {
	var sgvCtx = document.getElementById("sgvCanvas").getContext("2d");
	scout.chart.sgv = new Chart(sgvCtx, scout.chartConf.sgv);

	var bgCtx = document.getElementById("bgCanvas").getContext("2d");
	scout.chart.bg = new Chart(bgCtx, scout.chartConf.bg);

	scout.fetch.halfday();

	scout.sgv.bindJump();
	
};
