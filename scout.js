var scout = {
	config: {
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
		if (sgv < scout.config.sgv.target_min) window.sgvInRange[1]++;
		else if (sgv > scout.config.sgv.target_max) window.sgvInRange[3]++;
		else window.sgvInRange[2]++;
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
	inRange: null,
	bgSum: 0,
	bgCount: 0
};

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

	window.displayedData = [];
	window.sgvInRange = [0, 0, 0, 0];
	window.bgSum = 0;
	window.bgCount = 0;
	superagent.get("test-data.json", function(resp) {
		var data = JSON.parse(resp.text);
		console.log(data);
		var ldata = [];
		var dataset = scout.chart.sgv.config.data.datasets[0];
		if(!dataset.data) dataset.data = [];
		if(!dataset.pointBackgroundColor) dataset.pointBackgroundColor = [];
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			if (!(obj in displayedData)) {
				dataset.data.push({
					x: moment(obj['dateString']),
					y: obj['sgv']
				});
				scout.util.updateInRange(obj['sgv']);
				window.bgSum += obj['sgv'];
				window.bgCount++;
			}
			displayedData.push(obj);
			dataset.pointBackgroundColor.push(scout.util.colorForSgv(obj['sgv']))
		}
		
		console.log(ldata);
		scout.chart.sgv.update();

		var bgSet = scout.chart.bg.config.data.datasets[0];
		bgSet.data = [];
		for (var i=0; i<sgvInRange.length; i++) {
			bgSet.data.push(sgvInRange[i]);
		}
		scout.chart.bg.config.data['middleText'] = scout.util.round(window.bgSum/window.bgCount, 0);
		//displayedData[0]['sgv'] +' ' +directionToArrow(displayedData[0]['direction'])
		scout.chart.bg.update();

	});

};
