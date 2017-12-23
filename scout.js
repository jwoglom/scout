var SGV_TARGET_MAX = 200;
var SGV_TARGET_MIN = 80;
var timeFormat = 'MM/DD/YYYY HH:mm';

function colorForSgv(sgv) {
	if (sgv < SGV_TARGET_MIN) return 'rgb(255, 0, 0)';
	if (sgv > SGV_TARGET_MAX) return 'rgb(255, 0, 0)';
	return 'rgb(0, 255, 0)';
}

function updateInRange(sgv) {
	if (sgv < SGV_TARGET_MIN) window.sgvInRange[1]++;
	else if (sgv > SGV_TARGET_MAX) window.sgvInRange[3]++;
	else window.sgvInRange[2]++;
}

function pctA1c(avg_sgv) {
	return (46.7 + avg_sgv)/28.7;
}

function round(num, places) {
	return parseInt(num * Math.pow(10, places)) / Math.pow(10, places);
}

function directionToArrow(dir) {
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

var sgvConf = {
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
					format: timeFormat,
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
				yMax: SGV_TARGET_MIN,
				xMin: moment("1969-12-31T23:59:59-0500"),
				xMax: moment("2969-12-31T23:59:59-0500"),
				backgroundColor: "rgba(255, 0, 0, 0.1)"
			}, {
				drawTime: "beforeDatasetsDraw",
				id: "highRange",
				type: "box",
				xScaleID: "x-axis-0",
				yScaleID: "y-axis-0",
				yMin: SGV_TARGET_MAX,
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
				yMin: SGV_TARGET_MIN,
				yMax: SGV_TARGET_MAX,
				xMin: moment("1969-12-31T23:59:59-0500"),
				xMax: moment("2969-12-31T23:59:59-0500"),
				backgroundColor: "rgba(0, 255, 0, 0.1)",
				borderColor: "rgba(0, 255, 0, 1)",
				borderWidth: 2
			}]
		}

	},
};

var bgConf = {
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
				yMax: SGV_TARGET_MIN,
				xMin: moment("1969-12-31T23:59:59-0500"),
				xMax: moment("2969-12-31T23:59:59-0500"),
				backgroundColor: "rgba(255, 0, 0, 0.1)"
			}, {
				drawTime: "beforeDatasetsDraw",
				id: "highRange",
				type: "box",
				xScaleID: "x-axis-0",
				yScaleID: "y-axis-0",
				yMin: SGV_TARGET_MAX,
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
				yMin: SGV_TARGET_MIN,
				yMax: SGV_TARGET_MAX,
				xMin: moment("1969-12-31T23:59:59-0500"),
				xMax: moment("2969-12-31T23:59:59-0500"),
				backgroundColor: "rgba(0, 255, 0, 0.1)",
				borderColor: "rgba(0, 255, 0, 1)",
				borderWidth: 2
			}]
		}
    }
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
	window.sgvChart = new Chart(sgvCtx, sgvConf);

	var bgCtx = document.getElementById("bgCanvas").getContext("2d");
	window.bgChart = new Chart(bgCtx, bgConf);

	window.displayedData = [];
	window.sgvInRange = [0, 0, 0, 0];
	window.bgSum = 0;
	window.bgCount = 0;
	superagent.get("test-data.json", function(resp) {
		var data = JSON.parse(resp.text);
		console.log(data);
		var ldata = [];
		var dataset = sgvChart.config.data.datasets[0];
		if(!dataset.data) dataset.data = [];
		if(!dataset.pointBackgroundColor) dataset.pointBackgroundColor = [];
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			if (!(obj in displayedData)) {
				dataset.data.push({
					x: moment(obj['dateString']),
					y: obj['sgv']
				});
				updateInRange(obj['sgv']);
				window.bgSum += obj['sgv'];
				window.bgCount++;
			}
			displayedData.push(obj);
			dataset.pointBackgroundColor.push(colorForSgv(obj['sgv']))
		}
		
		console.log(ldata);
		window.sgvChart.update();

		var bgSet = bgChart.config.data.datasets[0];
		bgSet.data = [];
		for (var i=0; i<sgvInRange.length; i++) {
			bgSet.data.push(sgvInRange[i]);
		}
		bgChart.config.data['middleText'] = round(window.bgSum/window.bgCount, 0);
		//displayedData[0]['sgv'] +' ' +directionToArrow(displayedData[0]['direction'])
		window.bgChart.update();

	});

};
