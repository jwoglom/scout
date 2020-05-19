/***********************************************
* scout: CGM data analysis tool for Nightscout *
* https://github.com/jwoglom/scout             *
************************************************/
var scout = {
	config: {
		urls: {
			apiRoot: '',
			sgvEntries: 'entries/sgv.json',
			mbgEntries: 'entries/mbg.json',
			deviceStatus: 'devicestatus.json',
			status: 'status.json',
			treatments: 'treatments.json',

			domainRoot: '',
			socketio_path: '/socket.io/',
			socketio_js: 'socket.io.js'
		},
		sgv: {
			target_min: 80,
			target_max: 200,
			spike_delta: 12,
			graph_min: 40,
			graph_max: 240
		},
		mbg: {
			radius: 5
		},
		old_minutes: 15,
		missed_minutes: 10,
		pct_split_mins: 15,
		modifyTitle: false,
		timeFormat: 'MM/DD/YYYY HH:mm',
		favicon_alternate_ms: 5000,
		reload_ms: 30*1000,
		notification_ms: 5000,
		notifyOldData_mins: 20,
		uploaderBat_default_readings: 1000,
		sensor_age_days: 7,
		fetch_mode: 'websocket',
		fetch_delta_fallback: true,
		fix_sgv_direction: true,
		notify_for_converted_deltas: false,
		graph_gradient: false,
		tooltip_device_strip: 'xDrip-DexcomG5',
		graph_highlight_backfill: true
	}
};

scout.util = {
	colorForSgv: function(sgv) {
		if (sgv < scout.config.sgv.target_min) return 'rgb(255, 0, 0)';
		if (sgv >= scout.config.sgv.target_max) return 'rgb(255, 127, 0)';
		return 'rgb(0, 255, 0)';
	},

	bgColorForSgv: function(sgv) {
		if (sgv < scout.config.sgv.target_min) return 'rgb(255, 127, 127)';
		if (sgv >= scout.config.sgv.target_max) return 'rgb(255, 127, 0)';
		return 'rgb(0, 255, 0)';
	},

	colorForSgvBackfill: function(sgv) {
		if (sgv < scout.config.sgv.target_min) return 'rgb(255, 0, 200)';
		if (sgv >= scout.config.sgv.target_max) return 'rgb(255, 127, 127)';
		return 'rgb(0, 255, 255)';
	},

	updateInRange: function(obj, sgv) {
		if (sgv < scout.config.sgv.target_min) obj.inRange[1]++;
		else if (sgv >= scout.config.sgv.target_max) obj.inRange[3]++;
		else obj.inRange[2]++;
		if (sgv > obj.highBg) obj.highBg = sgv;
		if (sgv < obj.lowBg) obj.lowBg = sgv;
	},

	pctA1c: function(avg_sgv) {
		return (46.7 + avg_sgv)/28.7;
	},

	round: function(num, places) {
		return parseInt(num * Math.pow(10, places)) / Math.pow(10, places);
	},

	percent: function(num, decimalPlaces) {
		var places = parseInt(decimalPlaces) || 0;
		return new String(scout.util.round(num, 2+places) * 100).substr(0, 3+places)+"%";
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

	timeAgo: function(date) {
		var mom = moment(date).fromNow();
		if (mom == "a few seconds ago") {
			return "just now";
		}
		return mom;
	},

	embedTimeago: function(date) {
		var fmt = moment(date).format();
		return '<span class="timeago" datetime="' + fmt + '" title="' + fmt + '"></span>';
	},

	minsAgo: function(date) {
		return moment.duration(moment().diff(date)).asMinutes();
	},

	noise: function(n) {
		if (!n) return '';
		return [
			'?',
			'✓',
			'⚠ Light Noise',
			'⚠ Moderate Noise',
			'⚠ High Noise'
		][parseInt(n)];
	},

	isOldData: function(date) {
		return moment.duration(moment().diff(date)).asMinutes() >= scout.config.old_minutes;
	},

	isMissedData: function(date) {
		return moment.duration(moment().diff(date)).asMinutes() >= scout.config.missed_minutes;
	},

	getShortTimeDiff: function(date) {
		var df = moment.duration(moment().diff(date));
		if (df.asMinutes() < 60) return Math.round(df.asMinutes())+"m";
		if (df.asHours() < 10) return parseInt(df.asHours())+"h"+scout.util.zeroPad(df.asMinutes()%60);
		return parseInt(df.asHours())+"h";
	},

	zeroPad: function(digit) {
		var d = parseInt(digit);
		if (d < 10) return "0"+d;
		return d;
	},

	convertTrDate: function(sgvDate) {
		return (""+sgvDate).replace(/T/, " ");
	},

	sensorAgeColor: function(hrs) {
		if (hrs < 6*24) return 'rgba(255,0,0,0.5)';
		if (hrs > 8*24) return 'rgba(0,0,255,0.5)';
		return 'rgba(0,255,0,0.5)';
	},

	batColor: function(bat) {
		if (bat < 15) return 'rgba(255,0,0,0.5)';
		if (bat < 35) return 'rgba(255,255,0,0.5)';
		return 'rgba(0,255,0,0.5)';
	},

	fmtDuration: function(tm) {
		var dur = moment.duration(tm);
		var out = "";
		if (dur.asDays() >= 1) out += parseInt(dur.asDays())+" days, ";
		if (dur.asHours() >= 1) {
			var hrs = parseInt(dur.asHours()%24);
			out += hrs+" hour";
			if (hrs != 1) out += "s";
			out += ", ";
		}
		out += parseInt(dur.asMinutes()%60)+" minutes, ";
		return out.substring(0, out.length-2);
	},

	fmtDelta: function(delta) {
		return delta > 0 ? '+'+scout.util.round(delta, 1) : scout.util.round(delta, 1);
	},

	modifyFavicon: function(href) {
		var link = document.querySelector("link[rel='icon']");
		link.setAttribute('type', 'image/png');
		link.setAttribute('href', href);
	},

	updateTimeago: function() {
		// needs to be re-run after DOM changes
		timeago().render(document.querySelectorAll('.timeago'));
	},

	graphGradient: function(type, sgvCtx) {
		var g = sgvCtx.createLinearGradient(0, 0, 0, 500);
		var VERY_LOW = 'rgba(255, 0, 0, 1)';
		var LOW = 'rgba(255, 0, 0, 0.1)';
		var GOOD = 'rgba(0, 255, 0, 0.3)';
		var HIGH = 'rgba(255, 127, 0, 0.1)';
		var VERY_HIGH = 'rgba(255, 127, 0, 0.5)';
		if (type == 'lowRange') {
			// rgba(255, 0, 0, 0.1)
			g.addColorStop(0, VERY_LOW);
			g.addColorStop(1, LOW);
		} else if (type == 'goodRange') {
			// rgba(0, 255, 0, 0.1)

			g.addColorStop(1, LOW);
			g.addColorStop(0.8, GOOD);
			g.addColorStop(0.2, GOOD);
			g.addColorStop(0, HIGH);
		} else if (type == 'highRange') {
			// rgba(255, 127, 0, 0.1)
			g.addColorStop(0.5, HIGH);
			g.addColorStop(0, VERY_HIGH);
		}

		return g;
	},

	isBackfilledSgv: function(sgv) {
		return sgv['device'].indexOf('Backfill') != -1;
	}
};

scout.chartConf = {
	sgv: {
		type: 'line',
		data: {
			labels: [// date
			],
			datasets: [{
				label: 'Glucose',
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				borderColor: 'rgb(0, 0, 0)',
				fill: false,
				data: []
			}, {
				label: 'Average',
				fill: false,
				pointRadius: 0,
				borderDash: [5, 5],
				backgroundColor: 'rgba(0, 127, 255, 0.5)',
				borderColor: 'rgba(0, 127, 255, 0.5)',
				type: 'line',
				data: [],
				tooltips: false
			}, {
				label: 'Bolus',
				fill: false,
				backgroundColor: 'rgba(255, 0, 0, 0.5)',
				borderColor: 'rgba(255, 0, 0, 0.5)',
				type: 'bubble',
				tooltips: false,
				datalabels: {
					display: true,
					borderRadius: 4,
					// backgroundColor: 'rgba(255, 0, 0, 0.5),
					color: 'white',
					font: {
						weight: 'bold'
					},
					align: 'start',
					anchor: 'start',
				},
				data: []
			}, {
				label: 'Fingerstick',
				fill: false,
				backgroundColor: 'rgba(0, 0, 255, 0.5)',
				borderColor: 'rgb(0, 0, 0)',
				type: 'bubble',
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
	        tooltips: {
	        	mode: 'nearest',
	        	intersect: false,
	        	callbacks: {
					label: function(tooltipItem, data) {
						var dataset = data.datasets[tooltipItem.datasetIndex];
						var idata = dataset.data[tooltipItem.index];
						if (dataset['label'] == 'Bolus' && !idata['r']) {
							return ''; // hide Bolus label and value for notes
						}
						return Chart.defaults.global.tooltips.callbacks.label(tooltipItem, data);
					},
	        		afterLabel: function(tooltipItem, data) {
	        			var dataset = data.datasets[tooltipItem.datasetIndex];
		        		var data = dataset.data[tooltipItem.index];
		        		if (data['sgvObj']) {
		        			return scout.util.directionToArrow(data.sgvObj['direction']) +
		                           " "+data.sgvObj['delta']+" mg/dl";
		        		} else if (data['mbgObj']) {
		        			return data.mbgObj['device'] || 'unknown device';
		        		} else if (data['trObj'] && !!data.trObj['carbs']) {
		        			return "Carbs: "+data.trObj['carbs'];
		        		}
	        			//return parseInt(tooltipItem.yLabel)+" yLabel";
					},
	        		footer: function(tooltipItems, data) {
	        			var tooltipItem = tooltipItems[0]; // fixme, iterate over all
	        			var dataset = data.datasets[tooltipItem.datasetIndex];
		        		var data = dataset.data[tooltipItem.index];
		        		if (data['trObj']) {
	        				return data.trObj['notes'].split('\n');
	        			} else if (data['sgvObj']) {
	        				return data.sgvObj['device'].replace(scout.config.tooltip_device_strip, '').trim();
	        			}
	        		}
	        	}
			},
			plugins: {
				datalabels: {
					backgroundColor: function(context) {
						console.log('bgc', context);
						var index = context.dataIndex;
						var value = context.dataset.data[index];
						if (!value['r'] && value['trObj']['notes']) {
							return 'rgba(255, 128, 0, 0.75)';
						}
						return 'rgba(255, 0, 0, 0.5)';
					},

					formatter: function(value, context) {
						console.log('fmt', value, context);
						if (!value['r'] && value['trObj']['notes']) {
							return 'Note';
						}
						return value['r'];
					}
				}
			},
			scales: {
				xAxes: [{
					type: "time",
					time: {
						parser: scout.config.timeFormat,
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
						suggestedMin: scout.config.sgv.graph_min,
						suggestedMax: scout.config.sgv.graph_max,
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

	pct: {
		type: 'line',
		data: {
			labels: [// date
			],
			datasets: [{
				label: "Median",
				backgroundColor: 'rgba(0, 255, 0, 0.5)',
				borderColor: 'rgb(0, 255, 0)',
				fill: false,
				data: []
			}, {
				label: "Average",
				backgroundColor: 'rgba(255, 255, 0, 0.5)',
				borderColor: 'rgb(255, 255, 0)',
				fill: false,
				data: []
			}, {
				label: "25%",
				backgroundColor: 'rgba(0, 0, 255, 0.5)',
				borderColor: 'rgb(0, 0, 255)',
				fill: false,
				data: []
			}, {
				label: "75%",
				backgroundColor: 'rgba(0, 0, 255, 0.5)',
				borderColor: 'rgb(0, 0, 255)',
				fill: '-1',
				data: []
			}, {
				label: "10%",
				backgroundColor: 'rgba(255, 0, 0, 0.5)',
				borderColor: 'rgb(255, 0, 0)',
				fill: false,
				data: []
			}, {
				label: "90%",
				backgroundColor: 'rgba(255, 0, 0, 0.5)',
				borderColor: 'rgb(255, 0, 0)',
				fill: '-1',
				data: []
			}]
		},
		options: {
			responsive: true,
	        title: {
	            text: "Glucose"
	        },
	        tooltips: {
	        	mode: 'index',
	        	intersect: false
	        },
			scales: {
				xAxes: [{
					type: "time",
					time: {
						parser: scout.config.timeFormat,
						//unit: 'hour',
						//unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a'
						},
						// round: 'day'
						tooltipFormat: 'hh:mm a'
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
						suggestedMin: scout.config.sgv.graph_min,
						suggestedMax: scout.config.sgv.graph_max,
						stepSize: 40

					}
				}],
			},
			legend: {
				display: false
			},
			elements: {
				point: {
					radius: 1
				}
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
	},

	sab: {
		type: 'bar',
		data: {
			datasets: [{
				label: 'Sensor time',
				backgroundColor: [],
				data: []
			}]
		},

		options: {
			responsive: true,
			legend: {
				display: false
			},

			title: {
				display: false
			},

	        tooltips: {
	        	mode: 'index',
	        	intersect: false,
	        	callbacks: {
	        		label: function(tooltipItem, data) {
	        			return parseInt(tooltipItem.yLabel)+" days ("+parseInt(tooltipItem.yLabel*24)+" hours)";
	        		}
	        	}
	        },

			scales: {
				xAxes: [{
					type: 'time',
					time: {
						unit: 'day',
						//unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a',
							'day': 'MMM D'
						},
						tooltipFormat: 'MMM D hh:mm a'
					},
					scaleLabel: {
						display: false,
						labelString: 'Date'
					}
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: 'days'
					},
					ticks: {
						suggestedMin: 0,
					}
				}]
			}
		}
	},

	bat: {
		type: 'line',
		data: {
			labels: [// date
			],
			datasets: [{
				label: 'Battery',
				backgroundColor: [],
				borderColor: [],
				fill: false,
				data: []
			}]
		},
		options: {
			responsive: true,
	        title: {
	            text: "Battery"
	        },
	        tooltips: {
	        	mode: 'index',
	        	intersect: false
	        },
			scales: {
				xAxes: [{
					type: "time",
					time: {
						parser: scout.config.timeFormat,
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
						labelString: '%'
					},
					ticks: {
						suggestedMin: 0,
						suggestedMax: 100

					}
				}],
			},
			legend: {
				display: false
			},

			elements: {
				point: {
					radius: 0
				}
			}
		}
	}
};

scout.chart = {
	sgv: null,
	bg: null
};

scout.tpl = {
	/*
	 * render a HTML template
	 * for all keys in dict, replace {key} in the template with its value
	 */
	renderHTML: function(tplId, dict) {
		var tpl = document.querySelector("script#" + tplId);
		var html = tpl.innerHTML;
		for (var key in dict) {
			html = html.replace(new RegExp("\\{" + key + "\\}", "g"), dict[key]);
		}
		return html;
	}
}

/*
 * Wrapper around spinners
 */
scout.spinner = {
	spinners: {
		'inRange': '#in_range_spinner',
		'hourlyPct': '#hourly_pct_spinner',
		'uploaderBat': '#uploader_bat_spinner'
	},
	
	get: function(sp) {
		return document.querySelector(scout.spinner.spinners[sp]);
	},

	start: function(sp) {
		scout.spinner.get(sp).classList.remove('hidden');
	},

	finish: function(sp) {
		scout.spinner.get(sp).classList.add('hidden');
	}
}

/*
 * In Range module
 */
scout.inRange = {
	spinner: null,
	init: function() {
		var today = moment().format("YYYY-MM-DD");
		var lastwk = moment().subtract({days: 7}).format("YYYY-MM-DD");
		document.querySelector("#in_range_single").value = today;
		document.querySelector("#in_range_start").value = lastwk;
		document.querySelector("#in_range_end").value = today;

	},

	submitFormSingle: function() {
		scout.spinner.start('inRange');
		var date = document.querySelector("#in_range_single").value;
		scout.inRange.addDay(moment(date).format());
	
	},

	submitFormRange: function() {
		scout.spinner.start('inRange');
		var date1 = moment(document.querySelector("#in_range_start").value);
		var date2 = moment(document.querySelector("#in_range_end").value);
		scout.inRange.addRange(moment.min(date1, date2).format(), moment.max(date1, date2).format());
	},

	addDay: function(date) {
		var showBolus = document.querySelector("#in_range_show_bolus").checked;
		scout.fetch.eq(date, function(data) {
			if (!showBolus) data["tr"] = [];
			scout.inRange.embedSingle(data, [date], showBolus);
		});
	},

	addRange: function(st_date, end_date) {
		var showBolus = document.querySelector("#in_range_show_bolus").checked;
		scout.fetch.range(st_date, end_date, function(data) {
			if (!showBolus) data["tr"] = [];
			scout.inRange.embedSingle(data, [st_date, end_date]);
		});
	},

	embedSingle: function(fullData, dates) {
		var data = fullData["sgv"];
		console.debug("embed data", data);
		var outer = document.querySelector("#in_range");
		var id = Math.random().toString(36).substring(2);
		var dict = scout.inRange.dataDict(data, id, dates);
		dict['id'] = id;
		dict['date'] = dates.join("--");
		var html = scout.tpl.renderHTML("in_range_tpl", dict);
		var newDiv = document.createElement("div");
		newDiv.innerHTML = html;
		outer.appendChild(newDiv.children[0]);
		scout.bg.load("in_range_canvas_"+id, data);
		scout.sgv.load("in_range_sgv_canvas_"+id, fullData, null, {tooltips: true, thinLines: true});

		scout.spinner.finish('inRange');
	},

	/*
	 * Generate the dictionary of templating data
	 */
	dataDict: function(data, id, dates) {
		var dict = {};
		var chartData = scout.bg.genChartData(data);

		if (dates.length == 1) {
			dict['header_date'] = moment(dates[0]).format("MMMM Do, YYYY");
		} else {
			dict['header_date'] = moment(dates[0]).format("MMMM Do")+" - "+moment(dates[1]).format("MMMM Do, YYYY");
		}

		console.debug('inRange chartData', chartData, data);
		if (chartData.bgCount == 0) {
			for (var i=0, j=[
				'cap_pct', 'realtime_pct', 'realtime_miss', 'in_range_pct', 'out_range_pcts', 'high_low_bg', 'avg_bg', 'avg_a1c'
			]; i<j.length; i++) dict[j[i]] = 'n/a';
			return dict;
		}

		var inRangePct = chartData.inRange[2]/chartData.bgCount;
		var lowRangePct = chartData.inRange[1]/chartData.bgCount;
		var highRangePct = chartData.inRange[3]/chartData.bgCount;
		var avgBg = chartData.bgSum/chartData.bgCount;
		var totalPct = Math.min(1, chartData.bgCount / chartData.totalPossibleBgs);
		var realtimePct = (chartData.bgCount - chartData.backfillCount) / chartData.bgCount;

		dict['cap_pct'] = scout.util.percent(totalPct, 2);
		dict['realtime_pct'] = scout.util.percent(realtimePct, 2);
		dict['realtime_miss'] = chartData.backfillCount;
		dict['in_range_pct'] = scout.util.round(inRangePct, 4)*100+"%";
		dict['out_range_pcts'] = scout.util.percent(lowRangePct)+"/"+scout.util.percent(highRangePct);
		dict['high_low_bg'] = Math.round(chartData.highBg)+"/"+Math.round(chartData.lowBg);
		dict['avg_bg'] = ""+Math.round(avgBg);
		dict['avg_a1c'] = scout.util.round(scout.util.pctA1c(avgBg), 2)+"%A1c";

		return dict;
	}
};


scout.hourlyPct = {
	init: function() {
		var today = moment().format("YYYY-MM-DD");
		var lastwk = moment().subtract({days: 7}).format("YYYY-MM-DD");
		document.querySelector("#hourly_pct_start").value = lastwk;
		document.querySelector("#hourly_pct_end").value = today;

	},

	submitForm: function() {
		scout.spinner.start('hourlyPct');
		var date1 = moment(document.querySelector("#hourly_pct_start").value);
		var date2 = moment(document.querySelector("#hourly_pct_end").value);
		scout.hourlyPct.addRange(moment.min(date1, date2).format(), moment.max(date1, date2).format());
	},

	addRange: function(st_date, end_date) {
		scout.fetch.range(st_date, end_date, function(data) {
			scout.hourlyPct.embedSingle(data, [st_date, end_date]);
		});
	},

	embedSingle: function(fullData, dates) {
		var data = fullData["sgv"];
		console.debug("embed data", data);
		var outer = document.querySelector("#hourly_pct");
		var tpl = document.querySelector("script#hourly_pct_tpl");
		var id = Math.random().toString(36).substring(2);
		var html = tpl.innerHTML
			.replace(/\{id\}/g, id)
			.replace(/\{date\}/g, dates.join("--"));
		var dict = scout.hourlyPct.dataDict(data, id, dates);
		for (var key in dict) {
			html = html.replace(new RegExp("\\{" + key + "\\}", "g"), dict[key]);
		}
		var newDiv = document.createElement("div");
		newDiv.innerHTML = html;
		outer.appendChild(newDiv.children[0]);
		//scout.sgv.load("hourly_pct_canvas_"+id, data, null, {tooltips: true, thinLines: true});
		scout.pct.load("hourly_pct_canvas_"+id, fullData);

		scout.spinner.finish('hourlyPct');
	},

	/*
	 * Generate the dictionary of templating data
	 */
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

/*
 * Chart for percentiles
 */
scout.pct = {
	init: function(canvasId) {
		var pctCtx = document.getElementById(canvasId).getContext("2d");
		// todo: deep copy?
		var pctConf = scout.chartConf.pct;
		return new Chart(pctCtx, pctConf);
	},

	/*
	 * Generate the data piped to chartjs in render()
	 */
	genChartData: function(fullData) {
		// TODO: redo these calculations; there's something fishy
		// with the data that gets put on the graph, it looks off.
		var data = fullData["sgv"];
		var dFmt = "YYYY-MM-DD";
		var perDay = {}
		var dayi = 0;
		for (var i=0; i<data.length; i++) {
			var day = moment(data[i]["date"]).format(dFmt);
			if ( Object.keys(perDay).indexOf(day) != -1) {
				perDay[day].push(data[i]);
			} else {
				perDay[day] = [data[i]];
			}
		}
		console.debug("pct perDay", perDay);
		var perMins = [];
		for (var i=0; i<Object.keys(perDay).length; i++) {
			var day = perDay[Object.keys(perDay)[i]];
			for (var j=0; j<day.length; j++) {
				var dt = moment(day[j]['date']);
				var ms = Math.floor(dt.diff(dt.clone().startOf('day'), 'minutes')/scout.config.pct_split_mins);
				if (perMins[ms] != null) {
					perMins[ms].push(day[j]);
				} else {
					perMins[ms] = [day[j]];
				}
			}
		}
		console.debug("pct perMins", perMins);

		var median = [];
		var avg = [];
		var pct25 = [];
		var pct10 = [];
		function percentile(arr, p) {
			if (arr.length === 0) return 0;
			if (typeof p !== 'number') throw new TypeError('p must be a number');
			if (p <= 0) return arr[0];
			if (p >= 1) return arr[arr.length - 1];

			var index = arr.length * p,
			    lower = Math.floor(index),
			    upper = lower + 1,
			    weight = index % 1;

			if (upper >= arr.length) return arr[lower];
			return arr[lower] * (1 - weight) + arr[upper] * weight;
		}

		for (var i=0; i<perMins.length; i++) {
			var sgvObjs = perMins[i];
			var av = 0;
			var rawSgvs = [];
			for (var j=0; j<sgvObjs.length; j++) {
				rawSgvs.push(sgvObjs[j]['sgv']);
				av += parseInt(sgvObjs[j]['sgv']);
			}
			av = av/rawSgvs.length;
			rawSgvs.sort();
			if (rawSgvs.length % 2 == 0) {
				median[i] = (rawSgvs[rawSgvs.length/2 - 1] + rawSgvs[rawSgvs.length/2])/2;
			} else {
				median[i] = rawSgvs[(rawSgvs.length-1)/2];
			}
			pct25[i] = percentile(rawSgvs, 0.25);
			pct10[i] = percentile(rawSgvs, 0.10);
			avg[i] = av;

		}
		console.debug("pct median", median);
		console.debug("pct avg", avg);
		return {
			"median": median,
			"avg": avg,
			"pct25": pct25,
			"pct10": pct10
		};

	},

	/*
	 * Render a percentile chart given chartData to the element chart
	 */
	render: function(chart, chartData) {
		console.debug("pct chartData", chartData);
		var median = chartData["median"];
		var pct25 = chartData["pct25"];
		var pct10 = chartData["pct10"];
		var avg = chartData["avg"];
		var stDay = moment().startOf('day');
		{
			// median
			var dataset = chart.config.data.datasets[0];
			dataset.data = [];
			for (var i=0; i<median.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(median[i])
				});
			}
		}
		{
			// avg
			var dataset = chart.config.data.datasets[1];
			dataset.data = [];
			for (var i=0; i<avg.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(avg[i])
				});
			}
		}
		{
			// 25-low
			var dataset = chart.config.data.datasets[2];
			dataset.data = [];
			for (var i=0; i<pct25.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(pct25[i])
				});
			}
		}
		{
			// 25-hi
			var dataset = chart.config.data.datasets[3];
			dataset.data = [];
			for (var i=0; i<pct25.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(2*median[i] - pct25[i])
				});
			}
		}
		{
			// 10-low
			var dataset = chart.config.data.datasets[4];
			dataset.data = [];
			for (var i=0; i<pct10.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(pct10[i])
				});
			}
		}
		{
			// 10-hi
			var dataset = chart.config.data.datasets[5];
			dataset.data = [];
			for (var i=0; i<pct10.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(2*median[i] - pct10[i])
				});
			}
		}

		chart.update();
	},

	/*
	 * Generate a chart for the given canvasId and fill it with fullData
	 * Runs init, genChartData, and render
	 */
	load: function(canvasId, fullData) {
		var chart = scout.pct.init(canvasId);
		scout.pct.render(chart, scout.pct.genChartData(fullData));
		chart.update();
		return chart;
	}
}

/*
 * Donut-shaped chart for glucose percent in range
 */
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
			bgCount: 0,
			highBg: data.length>0 ? data[0]['sgv'] : 0,
			lowBg: data.length>0 ? data[0]['sgv'] : 0,
			backfillCount: 0
		};
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			scout.util.updateInRange(dat, obj['sgv']);
			dat.bgSum += obj['sgv'];
			dat.bgCount++;
			if (scout.util.isBackfilledSgv(obj)) dat.backfillCount++;
		}
		console.debug("bg chartD", dat);

		dat.totalRangeMs = (data.length >= 1 ? data[0].date - data[data.length-1].date : 0);
		dat.totalPossibleBgs = Math.ceil(dat.totalRangeMs / (5 * 60 * 1000));
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

/*
 * Chart for generic blood glucose data
 */
scout.sgv = {
	currentLength: 12,

	reload: function() {
		scout.sgv.reloadCurrentLength(scout.sgv.primaryDSCallback);
	},

	reloadCurrentLength: function(cb) {
		console.debug("reloadCurrentLength", scout.sgv.currentLength);
		return scout.fetch.hours(scout.sgv.currentLength, cb);
	},

	primaryInit: function() {
		scout.chart.sgv = scout.sgv.init("sgvCanvas");
		scout.sgv.bindJump();
	},

	init: function(canvasId, extraConf) {
		var sgvCtx = document.getElementById(canvasId).getContext("2d");
		// single-layer copy. can't use full deep copy due to moment()
		var sgvConf = Object.assign({}, scout.chartConf.sgv);

		if (extraConf) {
			sgvConf['options']['tooltips']['enabled'] = extraConf['tooltips'];
			sgvConf['options']['usePointBackgroundColor'] = extraConf['usePointBackgroundColor'];
			if (extraConf['thinLines']) {
				sgvConf['data']['datasets'][0]['borderWidth'] = 2;
				sgvConf['options']['elements'] = {point: {radius: 0}};
			}
		}
		if (scout.config.graph_gradient) {
			var annotations = sgvConf['options']['annotation']['annotations'];
			for (var i=0; i<annotations.length; i++) {
				annotations[i]['backgroundColor'] = scout.util.graphGradient(annotations[i]['id'], sgvCtx)
			}
		}

		// hack for deep copy of data fields.
		sgvConf.data = JSON.parse(JSON.stringify(scout.chartConf.sgv.data));
		return new Chart(sgvCtx, sgvConf);
	},

	/*
	 * Bind the halfday/today/threeday/week zoom options' click handlers
	 * Runs on DOM page load
	 */
	bindJump: function() {
		function click(hours) {
			return function() {
				this.parentElement.querySelector(".is-active").classList.remove('is-active');
				this.classList.add('is-active');
				scout.sgv.currentLength = hours;
				console.debug("set currentLength=", scout.sgv.currentLength);
				scout.sgv.reload();
			}
		}
		document.querySelector("#sgv-jump-halfday").addEventListener('click', click(12));//scout.fetch.halfday
		document.querySelector("#sgv-jump-today").addEventListener('click', click(24));//scout.fetch.today
		document.querySelector("#sgv-jump-threeday").addEventListener('click', click(3*24));//scout.fetch.threeday
		document.querySelector("#sgv-jump-week").addEventListener('click', click(7*24));//scout.fetch.week
	},

	/*
	 * Binds the primary SGV chart as the one in overview
	 */
	primaryCallback: function(data) {
		scout.sgv.callback(scout.chart.sgv, data);
	},

	/*
	 * Fills the primary SGV chart with all data in ds
	 */
	primaryDSCallback: function() {
		scout.sgv.primaryCallback({
			'sgv': scout.ds.getLatestHrs('sgv', scout.sgv.currentLength),
			'tr': scout.ds.getLatestHrs('tr', scout.sgv.currentLength),
			'mbg': scout.ds.getLatestHrs('mbg', scout.sgv.currentLength)
		});
	},

	/*
	 * Generic callback for rendering chart with obtained data
	 */
	callback: function(chart, data) {
		scout.sgv.sgvCallback(chart, data);
		scout.sgv.trCallback(chart, data);
		scout.sgv.mbgCallback(chart, data);
	},

	/*
	 * Renders manual blood glucose entries on chart
	 */
	mbgCallback: function(chart, fullData) {
		var data = fullData["mbg"];
		if (!data) {
			console.debug("mbgCallback no data", fullData);
			return;
		}
		// Fingerstick
		var dataset = chart.config.data.datasets[3];
		dataset.data = [];
		
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			var mom = moment(obj['date']);

			// ensure in the correct time period
			var hrs = moment.duration(moment().diff(mom)).asHours();
			if (hrs <= scout.sgv.currentLength) {
				dataset.data.push({
					x: mom,
					y: obj['mbg'],
					r: scout.config.mbg.radius,
					mbgObj: obj
				});
				console.info('added graph MBG', obj, hrs);
			}
		}
		console.log("mbgCallback", data);
		
		chart.update();
	},

	/*
	 * Renders sensor glucose values on chart
	 */
	sgvCallback: function(chart, fullData) {
		var data = fullData["sgv"];
		console.log("sgvCallback data", data);
		var dataset = chart.config.data.datasets[0];
		dataset.data = [];
		var sum = 0;
		if (chart.options.usePointBackgroundColor) dataset.pointBackgroundColor = [];
		for (var i=0; i<data.length; i++) {
			var obj = data[i];

			if (obj['sgv'] > 400) {
				console.info('SGV value', obj, 'ignored');
				continue;
			}


			dataset.data.push({
				x: moment(obj['date']),
				y: obj['sgv'],
				sgvObj: obj
			});
			sum += obj['sgv'];
			
			if (chart.options.usePointBackgroundColor &&
				scout.config.graph_highlight_backfill &&
				scout.util.isBackfilledSgv(obj))
			{
				dataset.pointBackgroundColor.push(scout.util.colorForSgvBackfill(obj['sgv']));
			} else if (chart.options.usePointBackgroundColor) {
				dataset.pointBackgroundColor.push(scout.util.colorForSgv(obj['sgv']));
			}
		}
		var avg = Math.round(sum/dataset.data.length);
		console.debug("sgv avg", avg);
		var avgset = chart.config.data.datasets[1];
		avgset['data'] = [];
		for (var i=0; i<dataset.data.length; i++) {
			avgset['data'].push({
				x: dataset.data[i]['x'],
				y: avg
			});
		}
		chart.update();
	},

	/*
	 * Renders treatment values on chart
	 */
	trCallback: function(chart, fullData) {
		console.debug("trCallback", fullData);
		var data = fullData["tr"];
		var sgvData = fullData["sgv"];
		var dataset = chart.config.data.datasets[2];
		dataset.data = [];
		var yCoord = 80;
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			var pt = {
				x: moment(obj['created_at']),
				y: yCoord,
				r: obj['insulin'],
				trObj: obj
			};
			if (pt['r']) {
				console.debug("bolus", obj['created_at'], pt);
				dataset.data.push(pt);
			} else if (!!obj['notes']) {
				// todo: pt['backgroundColor'] = 'yellow';
				pt['r'] = 0;
				dataset.data.push(pt);
				console.debug("non-bolus note", obj['created_at'], pt);
			} else {
				console.debug("skipped non-bolus", obj['created_at'], pt);
			}
		}
		chart.update();
	},

	/*
	 * Inits data and bolusData
	 */
	load: function(canvasId, data, bolusData, extraConf) {
		var chart = scout.sgv.init(canvasId, extraConf);
		scout.sgv.callback(chart, data);
		if (bolusData) scout.sgv.bolusCallback(chart, bolusData, data);
		chart.update();
		return chart;
	}
};

/*
 * The data storage module. This provides a data store of glucose/insulin/sensor
 * information that can be centrally read, and enforces deduplication and updates
 * websocket-obtained data to full data when a manual fetch is called.
 */
scout.ds = {
	sgv: [],
	tr: [],
	devicestatus: [],
	mbg: [],
	/*
	cals: [],
	profiles: [],
	mbgs: []*/

	/*
	 * Add to scout.ds, without duplicating data.
	 * If a sgv or mbg value, ensure there's not a duplicate by checking the date,
	 * and if the value was 'converted' from websocket data, then update/replace
	 * the data. Otherwise, ensure no duplication by checking the _id.
	 */
	_add: function(type, data) {
		var cat = scout.ds[type];
		var adds = 0;
		for (var i=0; i<data.length; i++) {
			if (type == 'sgv' || type == 'mbg') {
				var fl = cat.filter(function(e) { return e['date'] == data[i]['date']; });
				if (fl.length == 0) {
					cat.push(scout.ds._fixSgvDirectionWrapper(data[i]));
					adds++;
				} else if (fl.length == 1 && fl[0]['converted']) {
					scout.ds[type] = scout.ds[type].filter(function(e) { return e['date'] != fl[0]['date']; });
					scout.ds[type].push(scout.ds._fixSgvDirectionWrapper(data[i]));
					console.debug("ds.addReplaceConverted["+fl[0]['date']+"]", fl, data[i]);
					adds++;
				}
			} else {
				var fl = cat.filter(function(e) { return e['_id'] == data[i]['_id']; });
				if (fl.length == 0) {
					cat.push(data[i]);
					adds++;
				} else if (fl.length == 1 && fl[0]['converted']) {
					console.error('unimplemented _add');
				}
			}
		}
		console.debug("ds.add["+type+"] "+adds+"/"+data.length);
		return adds;
	},

	/*
	 * The function that should be called externally to add data to ds.
	 */
	add: function(type, data) {
		var adds = scout.ds._add(type, data);
		if (adds > 0) {
			scout.ds._sort(type);
			scout.ds._typeCallback(type);
		}
	},

	/*
	 * Fix the direction of a sgv object when it's stuck on a direction
	 * of Flat (bug in xDrip nightly using G5 algorithm)
	 */
	_fixSgvDirection: function(sgv) {
		if (sgv['direction'] == 'Flat' && Math.abs(sgv['delta']) >= 5) {
			sgv['direction'] = scout.ds._calcSgvDirection(sgv['delta']);
			console.debug('fixSgvDirection: delta '+sgv['delta']+' fixed with '+sgv['direction']);
			return sgv;
		}
		return sgv;
	},

	/*
	 * Only run fixSgvDirection when enabled
	 */
	_fixSgvDirectionWrapper: function(sgv) {
		if (scout.config.fix_sgv_direction) {
			return scout.ds._fixSgvDirection(sgv);
		} else {
			return sgv;
		}
	},

	/*
	 * from xDrip, calculated by slope per minute (so *5)
	 */
	_calcSgvDirection: function(delta) {
		if (delta <= -3.5 * 5) {
			return "DoubleDown";
		} else if (delta <= -2 * 5) {
			return "SingleDown";
		} else if (delta <= -1 * 5) {
			return "FortyFiveDown";
		} else if (delta <= 1 * 5) {
			return "Flat";
		} else if (delta <= 2 * 5) {
			return "FortyFiveUp";
		} else if (delta <= 3.5 * 5) {
			return "SingleUp";
		} else if (delta <= 40 * 5) {
			return "DoubleUp";
		}
	},

	/*
	 * Convert websocket sgv data to a full sgv object.
	 * Because websocket data does not include a delta, calculate a mock delta
	 * from the previous sgv value.
	 */
	_convertSgv: function(sgv, prev) {
		return {
			'date': sgv['mills'],
			'dateString': moment(sgv['millis']).format(),
			'sysTime': moment(sgv['millis']).format(),
			'type': 'sgv',
			'delta': prev != null ? sgv['mgdl']-prev : 0,
			'device': sgv['device'],
			'direction': sgv['direction'],
			'filtered': sgv['filtered'],
			'noise': sgv['noise'],
			'rssi': sgv['rssi'],
			'sgv': sgv['mgdl'],
			'unfiltered': sgv['unfiltered'],
			'_id': sgv['mills'],
			'converted': true
		};
	},

	/*
	 * Convert websocket mbg data to a full mbg object.
	 */
	_convertMbg: function(mbg) {
		return {
			'date': mbg['mills'],
			'dateString': moment(mbg['millis']).format(),
			'sysTime': moment(mbg['millis']).format(),
			'type': 'mbg',
			'device': mbg['device'] || mbg['enteredBy'], // enteredBy for treatment conversion
			'mbg': mbg['mgdl'],
			'_id': mbg['mills'],
			'converted': true
		}
	},

	/*
	 * Convert multiple sgv's
	 */
	_convertSgvs: function(sgvs) {
		var upd = [];
		for (var i=0; i<sgvs.length; i++) {
			var prv;
			if (i > 0) {
				prv = sgvs[i-1]['mgdl'];
			} else {
				var latest = scout.ds.getLatest('sgv');
				prv = latest ? latest['sgv'] : null;
			}
			upd[i] = scout.ds._convertSgv(sgvs[i], prv);
		}
		console.debug("convertSgvs done: ", upd, "from:", sgvs);
		return upd;
	},

	/*
	 * Convert multiple mbg's
	 */
	_convertMbgs: function(mbgs) {
		var upd = [];
		for (var i=0; i<mbgs.length; i++) {
			upd[i] = scout.ds._convertMbg(mbgs[i]);
		}
		console.debug("convertMbgs done:", upd, "from:", mbgs);
		return upd;
	},

	/*
	 * Convert the glucose information in treatment data to mbg's.
	 * requireEventType should be set when running on websocket data,
	 * because it secretly adds a mgdl value of the current SGV.
	 */
	_convertMbgsFromTreatments: function(trs, requireEventType) {
		var upd = [];
		for (var i=0; i<trs.length; i++) {
			var eventTypeCheck = requireEventType ? (trs[i]['eventType'] == 'BG Check') : true;
			if (eventTypeCheck && trs[i]['mgdl'] > 0) {
				upd.push(scout.ds._convertMbg(trs[i]));
			}
		}
		console.debug("convertMbgsFromTreatments done:", upd, "from:", trs);
		return upd;
	},

	/*
	 * Add websocket data, and update from this delta.
	 * silentSgv should be set when the current SGV/graph data shouldn't
	 * be updated. (e.x., if multiple pieces of data are being added and
	 * this is going to be done all at once afterwords.)
	 */
	deltaAdd: function(data, silentSgv) {
		// TODO: optimize typeCallback multiple-run (at least with re-rendering graph)
		console.debug("ds.deltaAdd:", data);
		if (data["sgvs"]) {
			scout.ds._add("sgv", scout.ds._convertSgvs(data["sgvs"]));
			scout.ds._sort('sgv');
			if (!silentSgv) {
				scout.ds._typeCallback('sgv');
			}
		}
		if (data["devicestatus"]) scout.ds.add("devicestatus", data["devicestatus"]);
		if (data["treatments"]) {
			scout.ds.add("tr", data["treatments"]);
			// websocket data from nightscout adds 'mgdl' to non-BG Check fields
			// that is just the approximate current SGV value, so we don't want
			// to interpret them as MBGs.
			scout.ds.add("mbg", scout.ds._convertMbgsFromTreatments(data["treatments"], true));
		}
		if (data["mbgs"]) {
			scout.ds.add("mbg", scout.ds._convertMbgs(data["mbgs"]));
		}
	},

	/*
	 * Callbacks for when certain types of data have been updated.
	 * sgv data updates the latest SGV value, and the graph
	 * deviceStatus updates the latest status display
	 * treatment and mbg data updates the graph
	 */
	_typeCallback: function(type) {
		if (type == 'sgv') {
			scout.current.loadSgv(scout.ds.getLatest('sgv'));


			scout.sgv.primaryDSCallback();
			// update graph
		}
		else if (type == 'devicestatus') {
			scout.device.renderStatus(scout.ds['devicestatus']);
		}
		else if (type == 'treatments') {
			// update graph

			scout.sgv.primaryDSCallback();
		}
		else if (type == 'mbg') {
			scout.sgv.primaryDSCallback();
		}
	},

	/*
	 * Filter shortcut
	 */
	filter: function(type, filter) {
		return scout.ds[type].filter(filter);
	},

	/*
	 * Sort data of type
	 * Run when new data is added
	 */
	_sort: function(type) {
		scout.ds[type].sort(function(a, b) {
			return a.date-b.date;
		});
	},

	/*
	 * Get the date column used in the Nightscout provided data dump
	 * for the given type. Sensor values are stored in nightscout's
	 * mongo as 'date' while almost everything else uses 'created_at'
	 */
	_dateCol: function(type) {
		if (type == 'sgv') return 'date';
		if (type == 'tr') return 'created_at';
	},

	/*
	 * Get data of type within the last `hrs` hours.
	 */
	getLatestHrs: function(type, hrs) {
		return scout.ds.filter(type, function(e) {
			return moment.duration(moment().diff(e[scout.ds._dateCol(type)])).asHours() <= hrs;
		});
	},

	/*
	 * Get the latest point of this type. Newest data should be at the
	 * end of the array.
	 */
	getLatest: function(type) {
		var typ = scout.ds[type];
		return typ[typ.length-1];
	}
};

/*
 * Module for the current information shown above the graph on the main page.
 */
scout.current = {
	currentEntry: null,
	lastAttemptTime: null,
	/*
	 * Processes the latest SGV data point. Determines when the information is old,
	 * whether the point should trigger a browser notification, and updates the favicon.
	 */
	loadSgv: function(cur) {
		if (!cur) return;
		var new_data = (scout.current.currentEntry == null || scout.current.currentEntry['date'] != cur['date']);
		if (new_data) console.log("loadSgv new data @", new Date());

		var sgvText = cur['sgv'];
		var direction = scout.util.directionToArrow(cur['direction']);
		var delta = scout.util.fmtDelta(cur['delta']);
		var noise = scout.util.noise(cur['noise']);

		var curSgv = document.querySelector("#current_sgv");
		var curMins = document.querySelector("#current_minsago");

		var is_current = scout.current.shouldUpdateCurrent(cur);
		if (!is_current) {
			console.info("loadSgv not current");
			return;
		}

		var is_gap = scout.current.isGapCurrent(cur);
		var oldAttemptTime;
		if (is_gap) {
			 oldAttemptTime = scout.current.lastAttemptTime;
			 console.info("isGap oldAttemptTime=", oldAttemptTime);
		}

		scout.current.currentEntry = cur;
		scout.current.lastAttemptTime = new Date();

		curSgv.classList.remove('old-data');
		curMins.classList.remove('old-data');
		curSgv.classList.remove('missed-data');
		curMins.classList.remove('missed-data');

		if (scout.util.isOldData(cur['date'])) {
			direction = "old";
			curSgv.classList.add('old-data');
			curMins.classList.add('old-data');
			if (scout.current.shouldNotifyOldData(cur)) {
				console.debug("shouldNotifyOldData: yes");
				scout.current.notifyOldData(cur);
			} else console.debug("shouldNotifyOldData: no");
		} else if (scout.util.isMissedData(cur['date'])) {
			direction = "miss";
			curSgv.classList.add('missed-data');
			curMins.classList.add('missed-data');
		}

		curSgv.innerHTML = sgvText;
		curSgv.style.color = scout.util.colorForSgv(cur['sgv']);

		var delayedSec =  moment.duration(moment().diff(cur['date'])).asSeconds();
		console.debug('delayedSec', delayedSec);
		curMins.innerHTML = scout.util.embedTimeago(cur['date']);
		scout.util.updateTimeago();
		document.querySelector("#current_direction").innerHTML = direction;
		document.querySelector("#current_delta").innerHTML = delta;
		if (noise.length > 2) {
			noise += "<br />";
		}
		document.querySelector("#current_noise").innerHTML = noise;

		var title = cur['sgv']+''+direction+' '+delta+' '+noise+' - scout';
		if (scout.config.modifyTitle) {
			var tobj = document.querySelector("title");
			if (tobj.innerHTML != title) tobj.innerHTML = title;
		}
		scout.current.updateFavicon(cur, new_data);
		scout.current.notify(cur);


		if (is_gap) {
			console.info("isGap running manual fetch from", oldAttemptTime);
			scout.current.manualFetch(oldAttemptTime);
		}
	},

	/*
	 * Get the number of minutes between entry and the currentEntry,
	 * assuming entry is newer than currentEntry
	 */ 
	getCurrentMinDiff: function(entry) {
		if (!scout.current.currentEntry) {
			return null;
		}
		return parseInt(entry.date - scout.current.currentEntry.date) / (60 * 1000);
	},

	/*
	 * Whether currentEntry should be updated with entry
	 * returns true if entry is the newest and false if backfill data
	 */
	shouldUpdateCurrent: function(entry) {
		if (!scout.current.currentEntry) {
			return true;
		}

		var mins_diff = scout.current.getCurrentMinDiff(entry);
		if (mins_diff <= -1) {
			console.info("updateCur new backfill entry with diff=" + mins_diff);
			return false;
		}

		return true;
	},

	/*
	 * Whether there is a gap between the most recent point and the last
	 * stored point.
	 */
	isGapCurrent: function(entry) {
		if (!scout.current.currentEntry) {
			return false;
		}

		var mins_diff = scout.current.getCurrentMinDiff(entry);
		console.debug("isGapCurrent diff=", mins_diff);
		return (mins_diff > 5);
	},

	/*
	 * Updates the favicon using the current data point.
	 * With alternate, will flash the arrow/delta for favicon_alternate_ms
	 */
	updateFavicon: function(cur, alternate) {
		console.debug("favicon update", alternate ? "alternate" : "non-alternate", new Date());
		scout.util.modifyFavicon(scout.current.buildBgIcon(cur));
		if (alternate) {
			setTimeout(function() {
				console.debug("favicon tick", new Date());
				scout.util.modifyFavicon(scout.current.buildBgIcon(cur, true));
				setTimeout(function() {
					console.debug("favicon tock", new Date());
					scout.util.modifyFavicon(scout.current.buildBgIcon(cur, false));
				}, scout.config.favicon_alternate_ms);
			}, scout.config.favicon_alternate_ms);
		}
	},

	/*
	 * Builds the favicon using the current data point, by drawing to the hidden
	 * canvas and returning the png data URL.
	 */
	buildBgIcon: function(cur, show_delta) {
		var sgv = parseInt(cur['sgv']);
		var delta = scout.util.fmtDelta(cur['delta']);
		var arrow = scout.util.directionToThickArrow(cur['direction']);
		var noise = scout.util.noise(cur['noise']);
		if (noise.length > 1) arrow = noise.substring(0, 1);
		var canvas = document.getElementById("favicon_canvas");
		
		var bs = canvas.width;
		var n = function(i) {
			return (i/64) * bs;
		};
		var baseFont = "Open Sans";

		with (canvas.getContext("2d")) {
			clearRect(0, 0, canvas.width, canvas.height);
			if (scout.util.isOldData(cur['date'])) {
				var tline = "old";
				var tdiff = scout.util.getShortTimeDiff(cur['date']);
				fillStyle = "rgb(255,255,255)";
				fillRect(0, 0, n(64), n(64));

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				font = n(30)+"px "+baseFont;
				fillText(tdiff, n(32), n(30));

				font = n(40)+"px "+baseFont;
				fillText(tline, n(32), n(63));
			} else if (scout.util.isMissedData(cur['date'])) {
				var tdiff = scout.util.getShortTimeDiff(cur['date']);
				fillStyle = scout.util.bgColorForSgv(sgv);
				fillStyle = "rgb(255,255,255)";
				fillRect(0, 0, n(64), n(64));

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				font = n(30)+"px "+baseFont;
				fillText(tdiff, n(32), n(30));

				font = n(40)+"px "+baseFont;
				fillText(sgv, n(32), n(63));
			} else {
				fillStyle = scout.util.bgColorForSgv(sgv);
				fillRect(0, 0, n(64), n(64));

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				if (show_delta) {
					font = n(30)+"px "+baseFont;
					if (delta.length > 4 && delta.indexOf(".") != -1) {
						delta = delta.split(".")[0];
					}
					fillText(delta, n(32), n(30));
					textAlign = "center";
				} else {
					font = "bold "+n(40)+"px "+baseFont;
					fillText(arrow, n(32), n(30));
				}

				font = n(40)+"px "+baseFont;
				fillText(sgv, n(32), n(63));
			}
		}
		return canvas.toDataURL("image/png");
	},

	/*
	 * Criteria for creating a browser notification.
	 * Additional notification logic in shouldNotifyOldData for old data notification.
	 */
	shouldNotify: function(cur) {
		return (
			cur['noise'] > 1 || 
			cur['sgv'] < scout.config.sgv.target_min || 
			cur['sgv'] >= scout.config.sgv.target_max ||
			Math.abs(cur['delta']) >= scout.config.sgv.spike_delta
		) && ( // prevents notifying large delta from missing data
		       (scout.config.notify_for_converted_deltas ? true : !cur['converted'])
		) && ( // No repeats
			cur["_id"] != scout.current.nflast["_id"]);
	},

	shouldNotifyText: function(cur) {
		var ret = [];
		if (cur['noise'] > 1) {
			ret.push("NOISE: " + scout.util.noise(cur['noise']));
		}
		if (cur['sgv'] < scout.config.sgv.target_min) {
			ret.push("LOW ALERT");
		}
		if (cur['sgv'] > scout.config.sgv.target_max) {
			ret.push("HIGH ALERT");
		}
		if (cur['delta'] >= scout.config.sgv.spike_delta) {
			ret.push("HIGH SPIKE");
		}
		if (-1*cur['delta'] >= scout.config.sgv.spike_delta) {
			ret.push("LOW SPIKE");
		}
		return ret.join("\n");
	},

	nfobj: null,
	nflast: {"_id": null},

	/*
	 * Creates a browser notification. Decides whether this should be done by
	 * calling shouldNotify. If force, do so whether you should notify or not.
	 */
	notify: function(cur, force) {
		if (!("Notification" in window)) {
			console.error("No Notification object");
			return;
		}
		if (Notification.permission == "granted") {
			var shouldNotify = scout.current.shouldNotify(cur);
			console.debug("notify", shouldNotify, "force:", force);
			if (shouldNotify || !!force) {
				scout.current.nflast = cur;
				var direction = scout.util.directionToArrow(cur['direction']);
				var delta = cur['delta'] > 0 ? '+'+scout.util.round(cur['delta'], 1) : scout.util.round(cur['delta'], 1);
				var noise = scout.util.noise(cur['noise']);

				var text = "BG level is "+cur['sgv']+""+direction+" "+delta;
				var body = scout.current.shouldNotifyText(cur);
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
				setTimeout(function() {
					scout.current.nfobj.close()
				}, scout.config.notification_ms);
				return scout.current.nfobj;
			}
		} else if (Notification.permission != "denied") {
			console.error("Notification permission status:", Notification.permission);
			Notification.requestPermission(function(permission) {
				if (permission == "granted") scout.current.notify(cur);
			});
		} else {
			console.error("Notification permission status:", Notification.permission);
		}
	},

	/*
	 * Notifies because of old data. Only called when this is to occur; doesn't check precondition.
	 */
	notifyOldData: function(cur) {
		if (!("Notification" in window)) {
			console.error("No Notification object");
			return;
		}
		if (Notification.permission == "granted") {
			console.debug("notifyOldData", cur);

			var direction = scout.util.directionToArrow(cur['direction']);
			var delta = cur['delta'] > 0 ? '+'+scout.util.round(cur['delta'], 1) : scout.util.round(cur['delta'], 1);
			var noise = scout.util.noise(cur['noise']);

			var text = "Old data: " + scout.util.timeAgo(cur['date']);
			var body = "BG: "+cur['sgv']+" Delta: "+delta+" "+noise;
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
			setTimeout(function() {
				scout.current.nfobj.close()
			}, scout.config.notification_ms);
			return scout.current.nfobj;
		} else if (Notification.permission != "denied") {
			console.error("Notification permission status:", Notification.permission);
			Notification.requestPermission(function(permission) {
				if (permission == "granted") scout.current.notify(cur);
			});
		} else {
			console.error("Notification permission status:", Notification.permission);
		}
	},

	/*
	 * Whether data is old and a notification should be rendered.
	 */
	shouldNotifyOldData: function(cur) {
		var reload = 60/parseInt(scout.config.reload_ms/1000);
		return parseInt(scout.util.minsAgo(cur['date'])*reload) % (scout.config.notifyOldData_mins*reload) < 1;
	},

	/*
	 * Whether a manual fetch is needed if haven't gotten data in missed_minutes.
	 */
	needManualFetch: function() {
		var minDiff = moment.duration(moment().diff(scout.current.lastAttemptTime)).asMinutes();
		if (minDiff > scout.config.missed_minutes) console.log("manualFetch diff:", minDiff);
		return minDiff > scout.config.missed_minutes;
	},

	/*
	 * Determines when the last data was received of any type.
	 */
	getMinLatest: function() {
		// TODO: separate out in calls for scout.fetch?
		scout.current.lastAttemptTime = new Date();
		var latest = [];
		var sgvLatest = scout.ds.getLatest('sgv');
		if (sgvLatest) latest.push(moment(sgvLatest['date']));
		var trLatest = scout.ds.getLatest('tr');
		if (trLatest) latest.push(moment(trLatest['created_at']));
		var mbgLatest = scout.ds.getLatest('mbg');
		if (mbgLatest) latest.push(moment(mbgLatest['date']));

		var minLatest = Math.min.apply(null, latest);

		console.debug("latest", latest, minLatest);
		return minLatest;
	},

	/*
	 * Performs a manual fetch after the given point.
	 */
	manualFetch: function(minLatest) {
		scout.fetch.gte(moment(minLatest).format(), function(d) {
			console.log("manualFetch:", d);
		});
	},

	/*
	 * Check for whether a manual fetch needs to occur.
	 */
	checkManualFetch: function() {
		if (scout.current.needManualFetch()) {
			scout.current.manualFetch(scout.current.getMinLatest());
		} else {
			// update favicon for old data
			console.debug("manualFetch favicon update");
			scout.current.updateFavicon(scout.current.currentEntry, false);
		}
	}
};

/*
 * Fetch for SGV data.
 */
scout.sgvfetch = function(args, cb) {
	var parsed = "";
	if (args.count) parsed += "&count="+args.count;
	if (args.date) {
		if (args.date.gte) parsed += "&find[dateString][$gte]=" + args.date.gte;
		if (args.date.lte) parsed += "&find[dateString][$lte]=" + args.date.lte;
	}
	parsed += "&ts=" + (+new Date());
	superagent.get(scout.config.urls.apiRoot + scout.config.urls.sgvEntries+"?"+parsed, function(resp) {
		var data = JSON.parse(resp.text);
		scout.ds.add("sgv", data);
		cb(data);
	});
}

/*
 * Fetch for MBG data.
 */
scout.mbgfetch = function(args, cb) {
	var parsed = "";
	if (args.count) parsed += "&count="+args.count;
	if (args.date) {
		if (args.date.gte) parsed += "&find[dateString][$gte]=" + args.date.gte;
		if (args.date.lte) parsed += "&find[dateString][$lte]=" + args.date.lte;
	}
	parsed += "&ts=" + (+new Date());
	superagent.get(scout.config.urls.apiRoot + scout.config.urls.mbgEntries+"?"+parsed, function(resp) {
		var data = JSON.parse(resp.text);
		scout.ds.add("mbg", data);
		cb(data);
	});
}

scout.sgvfetch.gte = function(gte, cb) {
	return scout.sgvfetch({"date": {"gte": gte}, "count": 9999}, cb);
}

/*
 * Fetch for SGV, TR, and MBG data.
 */
scout.fetch = function(args, cb) {
	scout.sgvfetch(args, function(sgv) {
		scout.trfetch(args, function(tr) {
			scout.mbgfetch(args, function(mbg) {
				cb({
					"sgv": sgv,
					"tr": tr,
					"mbg": mbg
				});
			});
		});
	});
}

/*
 * Shortcuts for various ranges for fetching
 */
scout.fetch.gte = function(fmt, cb) {
	return scout.fetch({date: {"gte": fmt}, count: 99999}, cb);
}

scout.fetch.range = function(st, end, cb) {
	// "find[dateString][$gte]="+st+"&find[dateString][$lte]="+end+"&count=99999
	return scout.fetch({"date": {"gte": st, "lte": end}, "count": 99999}, cb);
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

scout.fetch.hours = function(hours, cb) {
	return scout.fetch.gte(moment().subtract({hours: hours}).format(), cb);	
}

/*
 * Module for status info for the current device.
 */
scout.device = {
	/*
	 * Get count number of device statuses
	 */
	fetchStatus: function(count, cb) {
		superagent.get(scout.config.urls.apiRoot + scout.config.urls.deviceStatus + "?count=" + parseInt(count) + "&ts=" + (+new Date()), function(resp) {
			var data = JSON.parse(resp.text);
			scout.ds.add('devicestatus', data);
			cb(data);
		});
	},

	/*
	 * Get the latest Sensor Start treatment
	 */
	fetchSensorStart: function(cb) {
		scout.trfetch({
			eventType: "Sensor+Start",
			date: {
				gte: 2017
			},
			count: 1
		}, cb);
	},

	/*
	 * Render the status of the uploader in the overview
	 */
	renderStatus: function(data) {
		var latest = data[0];
		console.log("latest devicestatus:", latest);
		document.querySelector("#device_battery").innerHTML = latest["uploader"]["battery"];
		document.querySelector("#device_name").innerHTML = latest["device"];
	},

	/*
	 * Render the status of the cgm in the overview
	 */
	renderSensor: function(trData) {
		var latest = trData[0];
		var created = latest["created_at"];
		var expire = moment(latest["created_at"]).add(scout.config.sensor_age_days, "days").format();
		console.log("latest sensorstart:", latest, created);
		document.querySelector("#cgm_sensor_age").innerHTML = scout.util.embedTimeago(created);
		document.querySelector("#cgm_sensor_replace").innerHTML = scout.util.embedTimeago(expire);
		scout.util.updateTimeago();
	},

	/*
	 * Update device and sensor status
	 */
	update: function() {
		scout.device.fetchStatus(1, scout.device.renderStatus);

		scout.device.fetchSensorStart(scout.device.renderSensor);
	}
};

/*
 * Fetch for treatment data.
 */
scout.trfetch = function(args, cb) {
	var parsed = "";
	if (args.count) parsed += "&count="+args.count;
	if (args.date) {
		if (args.date.gte) parsed += "&find[created_at][$gte]=" + scout.util.convertTrDate(args.date.gte);
		if (args.date.lte) parsed += "&find[created_at][$lte]=" + scout.util.convertTrDate(args.date.lte);
	}
	if (args.eventType) parsed += "&find[eventType]=" + escape(args.eventType);
	parsed += "&ts=" + (+new Date())
	console.debug("trfetch", args, parsed);
	superagent.get(scout.config.urls.apiRoot + scout.config.urls.treatments+"?"+parsed, function(resp) {
		var data = JSON.parse(resp.text);
		scout.ds.add("tr", data);
		scout.ds.add("mbg", scout.ds._convertMbgsFromTreatments(data, false));
		cb(data);
	});
};

/*
 * Shortcuts for fetching bolus data
 */
scout.trfetch.bolus = function(args, cb) {
	args["eventType"] = "Meal Bolus";
	return scout.trfetch(args, cb);
}

scout.trfetch.bolus.gte = function(fmt, cb) {
	return scout.trfetch.bolus({date: {"gte": fmt}, count: 99999}, cb);
}

scout.trfetch.bolus.range = function(st, end, cb) {
	return scout.trfetch.bolus({date: {"gte": st, "lte": end}, count: 99999}, cb);
}

scout.trfetch.bgcheck = function(args, cb) {
	args["eventType"] = "BG Check";
	return scout.trfetch(args, cb);
}

scout.trfetch.bgcheck.gte = function(fmt, cb) {
	return scout.trfetch.bgcheck({date: {"gte": fmt}, count: 99999}, cb);
}

scout.trfetch.bgcheck.range = function(st, end, cb) {
	return scout.trfetch.bgcheck({date: {"gte": st, "lte": end}, count: 99999}, cb);
}

/*
 * Module for Sensor Age Bar chart
 */
scout.sab = {
	init: function(canvasId, extraConf) {
		var sabCtx = document.getElementById(canvasId).getContext("2d");
		// single-layer copy. can't use full deep copy due to moment()
		var sabConf = Object.assign({}, scout.chartConf.sab);

		// hack for deep copy of data fields.
		sabConf.data = JSON.parse(JSON.stringify(scout.chartConf.sab.data));
		return new Chart(sabCtx, sabConf);
	},

	callback: function(chart, data) {
		var dataset = chart.data.datasets[0];
		var times = [];
		for (var i=0; i<data.length; i++) {
			var time = data[i]['created_at'];
			times.push(moment(time));
		}

		// oldest to newest
		times.sort(function(a, b) { return a-b; });
		for (var i=0; i<times.length; i++) {
			var nxt = new Date();
			if (i-1 != times.length) {
				nxt = times[i+1];
			}
			var diff = moment.duration(moment(nxt).diff(times[i]));
			dataset.data.push({
				x: times[i],
				y: diff.asDays()
			});
			dataset.backgroundColor.push(scout.util.sensorAgeColor(diff.asHours()));
		}

	},

	load: function(canvasId, data, extraConf) {
		var chart = scout.sab.init(canvasId, extraConf);
		scout.sab.callback(chart, data);
		chart.update();
		return chart;
	}
};

/*
 * Module for calculating sensor age
 */
scout.sensorAge = {
	init: function() {
		scout.trfetch({
			count: 9999,
			eventType: "Sensor Start",
			date: {
				gte: 2017
			}
		}, function(data) {
			scout.sab.load("sageBarCanvas", data);
			scout.sensorAge.currentStatus(data);
		});
	},

	currentStatus: function(data) {
		var cont = document.getElementById("sensor_age_status");
		var data = scout.sensorAge.currentStatusData(data);
		cont.innerHTML = scout.tpl.renderHTML("sensor_age_status_tpl", data);
	},

	currentStatusData: function(data) {
		var latest = data[0];
		var created = moment(latest['created_at']);
		var avgAge = scout.sensorAge.avgAgeHours(data);
		return {
			"sensor_last_inserted": created.format("MM/DD/YYYY hh:mm a"),
			"current_sensor_age": scout.util.fmtDuration(moment().diff(created)),
			"avg_sensor_age": scout.util.fmtDuration(moment.duration({hours: avgAge}))
		}
	},

	avgAgeHours: function(data) {
		var hrs = [];
		var times = [];
		for (var i=0; i<data.length; i++) {
			var time = data[i]['created_at'];
			times.push(moment(time));
		}

		// oldest to newest
		times.sort(function(a, b) { return a-b; });
		for (var i=0; i<times.length; i++) {
			if (i-1 != times.length) {
				var nxt = times[i+1];
				var diff = moment.duration(moment(nxt).diff(times[i]));
				hrs.push(diff.asHours());
			}
		}
		var avg = 0;
		for (var i=0; i<hrs.length; i++) {
			avg += hrs[i];
		}
		return avg/hrs.length;
	}
};

/*
 * Module for Battery status chart
 */
scout.bat = {
	init: function(canvasId, extraConf) {
		var batCtx = document.getElementById(canvasId).getContext("2d");
		// single-layer copy. can't use full deep copy due to moment()
		var batConf = Object.assign({}, scout.chartConf.bat);

		// hack for deep copy of data fields.
		batConf.data = JSON.parse(JSON.stringify(scout.chartConf.bat.data));
		return new Chart(batCtx, batConf);
	},

	/*
	 * Add battery data to chart dataset
	 */
	callback: function(chart, data) {
		var dataset = chart.data.datasets[0];
		dataset.backgroundColor = [];
		dataset.borderColor = [];
		var pcts = [];
		for (var i=0; i<data.length; i++) {
			var pct = parseInt(data[i]['uploader']['battery']);
			var time = moment(data[i]['created_at']);
			dataset.data.push({
				x: time,
				y: pct
			});
			dataset.backgroundColor.push(scout.util.batColor(pct));
			dataset.borderColor.push(scout.util.batColor(pct));
		}

	},

	load: function(canvasId, data, extraConf) {
		var chart = scout.bat.init(canvasId, extraConf);
		scout.bat.callback(chart, data);
		chart.update();
		return chart;
	}
};

/*
 * Module for getting uploader battery information
 */
scout.uploaderBat = {
	init: function() {
		scout.uploaderBat.refreshGraph();
	},

	/*
	 * Get the number of uploader readings to show in the chart
	 */
	getReadingsCount: function() {
		var readings = document.getElementById("uploader_bat_readings");
		if (!readings) {
			return scout.config.uploaderBat_default_readings;
		}
		return parseInt(readings.value);
	},

	/*
	 * Update the current status of the uploader on the page
	 */
	currentStatus: function(data) {
		var cont = document.getElementById("uploader_bat_status");
		var data = scout.uploaderBat.currentStatusData(data);
		cont.innerHTML = scout.tpl.renderHTML("uploader_bat_status_tpl", data);
	},

	/*
	 * Format the template data for status of the uploader
	 */
	currentStatusData: function(data) {
		var latest = data[0];
		var created = moment(latest['created_at']);
		return {
			"current_bat": latest["uploader"]["battery"],
			"current_bat_date": created.format(scout.config.timeFormat+" a"),
			"readings": scout.uploaderBat.getReadingsCount()
		};
	},

	/*
	 * Update the battery chart
	 */
	updateCanvas: function(data) {
		var cont = document.getElementById("uploader_bat_canvas_container");
		cont.innerHTML = scout.tpl.renderHTML("uploader_bat_canvas_tpl", {});
		scout.bat.load("uploaderBatCanvas", data);
	},

	/*
	 * Get the most recent device status
	 */
	refreshCurrentStatus: function() {
		scout.device.fetchStatus(1, function(data) {
			scout.uploaderBat.currentStatus(data);
		});
	},

	/*
	 * Grab new data for the graph using currently requested # of entries
	 */
	refreshGraph: function() {
		scout.spinner.start('uploaderBat');
		scout.device.fetchStatus(scout.uploaderBat.getReadingsCount(), function(data) {
			console.log("uploaderBat", data);
			scout.uploaderBat.updateCanvas(data);
			scout.uploaderBat.currentStatus(data);
			scout.spinner.finish('uploaderBat');
		});
	}
};

/*
 * Websocket initialization
 */
scout.ws = {
	socket: null,
	silentDataUpdates: 0,
	/*
	 * Initialize a ws connection 'silently', meaning don't inform the rest of the
	 * application that we're using websockets and still manually poll.
	 * This is practically useless.
	 */
	silentInit: function() {
		scout.ws.socket = io(scout.config.urls.domainRoot, {
			path: scout.config.urls.socketio_path
		});
		var socket = scout.ws.socket;
		
		socket.on('connect', function() {
		    console.log('Client connected to server.');
		    var history = 48;
		    socket.emit('authorize', {
		        client: 'web',
		        secret: null,
		        token: null,
		        history: history
		    }, function authCallback(data) {
		        console.log('Client rights:', data);
		    });
		  });

		socket.on('dataUpdate', function(data) {
			console.log('SilentDataUpdate', data);
			scout.ws.silentDataUpdates++;
			//scout.ds.deltaAdd(data);
		});
	},

	/*
	 * Initialize and connect to the ws socketio path and register the callback
	 * for dataUpdate socket events
	 */
	init: function() {
		scout.ws.socket = io(scout.config.urls.domainRoot, {
			path: scout.config.urls.socketio_path
		});
		var socket = scout.ws.socket;
		
		socket.on('connect', function() {
		    console.log('Client connected to server.');
		    var history = 48;
		    socket.emit('authorize', {
		        client: 'web',
		        secret: null,
		        token: null,
		        history: history
		    }, function authCallback(data) {
		        console.log('Client rights:', data);
				scout.device.update();
		    });
		  });

		socket.on('dataUpdate', function(data) {
			console.log('dataUpdate', data);
			scout.ds.deltaAdd(data, scout.config.fetch_data_fallback);
			// do a JSON request for this data to get a more accurate delta
			if (scout.config.fetch_delta_fallback) {
				var latest = scout.ds.getLatest('sgv')['date'];
				scout.sgvfetch.gte(moment(latest).format(), function(d) {
					console.log("SGVfetch latest on dataUpdate:", d);
				});
			}
		});
	}
};

/*
 * Initialization
 */
scout.init = {
	fetch: function() {
		if (scout.config.fetch_mode == 'ajax') {
			scout.init.ajax();
			scout.init.silentWebsocket();
		} else if (scout.config.fetch_mode == 'websocket') {
			scout.init.websocket();
			setInterval(scout.current.checkManualFetch, scout.config.reload_ms);
		}
	},

	ajax: function() {
		scout.sgv.reload();
		setInterval(function() {
			scout.sgv.reload();
		}, scout.config.reload_ms);
		scout.device.update();
	},

	websocket: function() {
		var scr = document.createElement('script');
		scr.type = 'text/javascript';
		scr.src = scout.config.urls.domainRoot + scout.config.urls.socketio_path + scout.config.urls.socketio_js;
		scr.onload = scout.ws.init;
		document.body.appendChild(scr);
	},

	silentWebsocket: function() {
		var scr = document.createElement('script');
		scr.type = 'text/javascript';
		scr.src = scout.config.urls.domainRoot + scout.config.urls.socketio_path + scout.config.urls.socketio_js;
		scr.onload = scout.ws.silentInit;
		document.body.appendChild(scr);
	}
};

/*
 * Chart.js extensions
 */
Chart.defaults.global.plugins.datalabels.display = false;
Chart.defaults.global.animation.duration = 250;
/*
 * Extension for center text inside donut charts (type sgv)
 */
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
	scout.init.fetch();
	scout.util.updateTimeago();
	if (window.location.search.indexOf('?dark') != -1) {
		var color = '#303030';
		var arg = window.location.search.split('?dark=');
		if (arg.length > 1) color = arg[1];
		var style = document.createElement('style');
		style.innerHTML = '' +
		'body, *, .mdl-card, .mdl-layout__tab-bar {' +
		'	background: ' + color + ';' +
		'	color: white;' +
		'}' +
		'body { min-height: inherit; }';
		document.body.appendChild(style);
	}
};
