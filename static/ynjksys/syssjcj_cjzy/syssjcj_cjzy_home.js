(function (global) {
    'use strict';

    var PAGE_CONFIG = {
        mockMode: false,
        defaultDbnm: 'ynjk',
        qids: {
            deviceOptions: 'ynjksys_01001q',
            summary: 'ynjksys_01002q',
            trend: 'ynjksys_01003q'
        }
    };

    var metricDefinitions = {
        file: {
            field: '采集文件数量',
            title: '采集文件数量趋势',
            unit: '个',
            color: '#3478f6',
            areaTop: 'rgba(52, 120, 246, .25)',
            areaBottom: 'rgba(52, 120, 246, .02)',
            emptyText: '暂无采集文件数据'
        },
        data: {
            field: '采集数据数量',
            title: '采集数据数量趋势',
            unit: '条',
            color: '#16a085',
            areaTop: 'rgba(22, 160, 133, .24)',
            areaBottom: 'rgba(22, 160, 133, .02)',
            emptyText: '暂无采集数据'
        },
        record: {
            field: '原始记录数量',
            title: '原始记录数量趋势',
            unit: '份',
            color: '#f39c36',
            areaTop: 'rgba(243, 156, 54, .24)',
            areaBottom: 'rgba(243, 156, 54, .02)',
            emptyText: '暂无原始记录数据'
        }
    };

    /* 模拟数据降级区：恢复模拟模式时取消本段注释，并将 mockMode 改为 true。
    var mockDatabase = {
        devices: [
            ['ICPMS-01', '电感耦合等离子体质谱仪'],
            ['GCMS-02', '气相色谱质谱联用仪'],
            ['HPLC-03', '高效液相色谱仪'],
            ['AAS-04', '原子吸收光谱仪']
        ],
        daily: [
            ['2026-07-22', 'ICPMS-01', 28, 1840, 9],
            ['2026-07-22', 'GCMS-02', 19, 1026, 6],
            ['2026-07-22', 'HPLC-03', 24, 1538, 8],
            ['2026-07-22', 'AAS-04', 16, 834, 5],
            ['2026-07-23', 'ICPMS-01', 31, 2056, 10],
            ['2026-07-23', 'GCMS-02', 21, 1148, 7],
            ['2026-07-23', 'HPLC-03', 26, 1695, 9],
            ['2026-07-23', 'AAS-04', 18, 972, 6],
            ['2026-07-24', 'ICPMS-01', 27, 1794, 9],
            ['2026-07-24', 'GCMS-02', 22, 1210, 7],
            ['2026-07-24', 'HPLC-03', 25, 1608, 8],
            ['2026-07-24', 'AAS-04', 17, 915, 5],
            ['2026-07-25', 'ICPMS-01', 34, 2268, 11],
            ['2026-07-25', 'GCMS-02', 23, 1295, 8],
            ['2026-07-25', 'HPLC-03', 29, 1882, 10],
            ['2026-07-25', 'AAS-04', 20, 1084, 7],
            ['2026-07-26', 'ICPMS-01', 30, 1986, 10],
            ['2026-07-26', 'GCMS-02', 20, 1108, 6],
            ['2026-07-26', 'HPLC-03', 27, 1750, 9],
            ['2026-07-26', 'AAS-04', 18, 946, 6],
            ['2026-07-27', 'ICPMS-01', 35, 2350, 12],
            ['2026-07-27', 'GCMS-02', 24, 1364, 8],
            ['2026-07-27', 'HPLC-03', 31, 2015, 10],
            ['2026-07-27', 'AAS-04', 21, 1136, 7],
            ['2026-07-28', 'ICPMS-01', 33, 2198, 11],
            ['2026-07-28', 'GCMS-02', 22, 1242, 7],
            ['2026-07-28', 'HPLC-03', 28, 1826, 9],
            ['2026-07-28', 'AAS-04', 19, 1025, 6]
        ]
    };
    if (global.SyssjcjMockData) { mockDatabase = global.SyssjcjMockData.getDashboardData(); }
    */

    var trendChart = null;
    var activeMetric = 'file';
    var latestTrendResult = null;

    function element(id) {
        return document.getElementById(id);
    }

    function parseDate(value) {
        if (!value) {
            return null;
        }
        var parts = value.split('-');
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }

    function formatDate(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function setDefaultDateRange() {
        var end = new Date();
        var start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
        element('startDate').value = formatDate(start);
        element('endDate').value = formatDate(end);
    }

    function rowsFromResult(result) {
        if (!result || !Array.isArray(result.data)) {
            return [];
        }
        if (!result.data.length || !Array.isArray(result.data[0])) {
            return result.data;
        }
        if (global.isqrydata && typeof global.isqrydata.convertDataToObject === 'function') {
            return global.isqrydata.convertDataToObject(result.data, result.title || []);
        }
        return result.data.map(function (row) {
            var item = {};
            (result.title || []).forEach(function (title, index) {
                item[title] = row[index];
            });
            return item;
        });
    }

    function commonParams() {
        var params = {};
        if (typeof global.buildCommonParams === 'function') {
            params = global.buildCommonParams() || {};
        }
        if (!params.dbnm || /^(none|null|undefined)$/i.test(String(params.dbnm))) {
            params.dbnm = PAGE_CONFIG.defaultDbnm;
        }
        if (!params.hp) {
            params.hp = 'ynjksys';
        }
        return params;
    }

    function queryPlatform(qid, businessParams) {
        return new Promise(function (resolve, reject) {
            if (!qid) {
                reject(new Error('平台查询号尚未配置'));
                return;
            }
            if (!global.isqrydata || typeof global.isqrydata.query !== 'function') {
                reject(new Error('isqrydata.js 未加载'));
                return;
            }
            var params = commonParams();
            Object.keys(businessParams || {}).forEach(function (key) {
                params[key] = businessParams[key];
            });
            global.isqrydata.query({
                qid: qid,
                data: params,
                successCallback: resolve,
                errorCallback: reject
            });
        });
    }

    function getFilters() {
        return {
            startDate: element('startDate').value,
            endDate: element('endDate').value,
            deviceCode: element('deviceSelect').value
        };
    }

    function validateFilters(filters) {
        if (!filters.startDate || !filters.endDate) {
            return '请选择完整的统计时间';
        }
        if (parseDate(filters.startDate) > parseDate(filters.endDate)) {
            return '开始日期不能晚于结束日期';
        }
        return '';
    }

    /* 模拟查询降级区：正式模式不执行。
    function filterMockRows(filters) {
        return mockDatabase.daily.filter(function (row) {
            var dateMatched = row[0] >= filters.startDate && row[0] <= filters.endDate;
            var deviceMatched = !filters.deviceCode || row[1] === filters.deviceCode;
            return dateMatched && deviceMatched;
        });
    }

    function mockDeviceOptions() {
        return Promise.resolve({
            title: ['设备编号', '设备名称'],
            data: mockDatabase.devices.slice()
        });
    }

    function mockSummary(filters) {
        var totals = filterMockRows(filters).reduce(function (result, row) {
            result[0] += row[2];
            result[1] += row[3];
            result[2] += row[4];
            return result;
        }, [0, 0, 0]);
        return Promise.resolve({
            title: ['采集文件数量', '采集数据数量', '原始记录数量'],
            data: [totals]
        });
    }

    function mockTrend(filters) {
        var totalsByDate = {};
        filterMockRows(filters).forEach(function (row) {
            if (!totalsByDate[row[0]]) {
                totalsByDate[row[0]] = [0, 0, 0];
            }
            totalsByDate[row[0]][0] += row[2];
            totalsByDate[row[0]][1] += row[3];
            totalsByDate[row[0]][2] += row[4];
        });
        var dates = Object.keys(totalsByDate).sort();
        return Promise.resolve({
            title: ['统计日期', '采集文件数量', '采集数据数量', '原始记录数量'],
            data: dates.map(function (date) {
                return [date].concat(totalsByDate[date]);
            })
        });
    }
    */

    var dataProvider = {
        loadDeviceOptions: function () {
            // if (PAGE_CONFIG.mockMode) return mockDeviceOptions();
            return queryPlatform(PAGE_CONFIG.qids.deviceOptions, {});
        },
        loadSummary: function (filters) {
            // if (PAGE_CONFIG.mockMode) return mockSummary(filters);
            return queryPlatform(PAGE_CONFIG.qids.summary, {
                start_date_sql_equal: filters.startDate,
                end_date_sql_equal: filters.endDate,
                instno_sql_equal: filters.deviceCode
            });
        },
        loadTrend: function (filters) {
            // if (PAGE_CONFIG.mockMode) return mockTrend(filters);
            return queryPlatform(PAGE_CONFIG.qids.trend, {
                start_date_sql_equal: filters.startDate,
                end_date_sql_equal: filters.endDate,
                instno_sql_equal: filters.deviceCode
            });
        }
    };

    function showMessage(message, type) {
        if (global.isloadpage && typeof global.isloadpage.openModal === 'function') {
            var params = commonParams();
            params.hp = 'common';
            params.message = encodeURIComponent(message || '');
            params.type = type || 'info';
            global.isloadpage.openModal({
                hp: 'common',
                hf: 'common_msg',
                params: params,
                title: '提示',
                width: 400,
                height: 280
            });
            return;
        }
        console.error(message);
    }

    function setButtonsDisabled(disabled) {
        element('queryButton').disabled = disabled;
        element('resetButton').disabled = disabled;
    }

    function loadDeviceOptions() {
        var select = element('deviceSelect');
        return dataProvider.loadDeviceOptions().then(function (result) {
            var rows = rowsFromResult(result);
            var fragment = document.createDocumentFragment();
            rows.forEach(function (row) {
                var option = document.createElement('option');
                option.value = row['仪器编号'] || row['设备编号'] || '';
                option.textContent = row['仪器设备'] || row['设备名称']
                    || row['仪器编号'] || row['设备编号'] || '';
                option.title = option.textContent;
                fragment.appendChild(option);
            });
            select.appendChild(fragment);
        }).catch(function (error) {
            console.error('仪器设备加载失败：', error);
        });
    }

    function formatNumber(value) {
        if (value === null || value === undefined || value === '') {
            return '--';
        }
        var number = Number(value);
        return Number.isFinite(number) ? number.toLocaleString('zh-CN') : '--';
    }

    function resetSummary() {
        element('fileCount').textContent = '--';
        element('dataCount').textContent = '--';
        element('recordCount').textContent = '--';
    }

    function renderSummary(result) {
        var rows = rowsFromResult(result);
        var row = rows[0] || {};
        element('fileCount').textContent = formatNumber(row['采集文件数量']);
        element('dataCount').textContent = formatNumber(row['采集数据数量']);
        element('recordCount').textContent = formatNumber(row['原始记录数量']);
    }

    function initChart() {
        if (!global.echarts) {
            throw new Error('ECharts 未加载');
        }
        if (!trendChart) {
            trendChart = global.echarts.init(element('fileTrendChart'));
        }
    }

    function setChartState(state) {
        element('chartLoading').classList.toggle('is-hidden', state !== 'loading');
        element('chartEmpty').classList.toggle('is-hidden', state !== 'empty');
        element('fileTrendChart').style.visibility = state === 'ready' ? 'visible' : 'hidden';
    }

    function renderTrend(result) {
        latestTrendResult = result;
        var rows = rowsFromResult(latestTrendResult);
        var metric = metricDefinitions[activeMetric];
        element('chartTitle').textContent = metric.title;
        element('chartEmpty').textContent = metric.emptyText;
        element('fileTrendChart').setAttribute('aria-label', metric.title + '折线图');
        var hasMetricData = rows.some(function (row) {
            var value = row[metric.field];
            return value !== null && value !== undefined && value !== '';
        });
        if (!rows.length || !hasMetricData) {
            if (trendChart) {
                trendChart.clear();
            }
            setChartState('empty');
            return;
        }
        initChart();
        trendChart.setOption({
            animationDuration: 450,
            color: [metric.color],
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(34, 40, 49, .9)',
                borderWidth: 0,
                textStyle: { color: '#fff' },
                formatter: function (items) {
                    var item = items[0];
                    return item.axisValue + '<br>' + metric.field + '：'
                        + formatNumber(item.value) + ' ' + metric.unit;
                }
            },
            legend: {
                top: 4,
                right: 18,
                data: [metric.field]
            },
            grid: {
                top: 52,
                right: 34,
                bottom: 40,
                left: 62
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: rows.map(function (row) { return row['统计日期']; }),
                axisLine: { lineStyle: { color: '#cfd6e1' } },
                axisLabel: { color: '#666' },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                name: '单位：' + metric.unit,
                nameTextStyle: { color: '#888', padding: [0, 0, 0, -6] },
                axisLine: { show: false },
                axisLabel: { color: '#666' },
                splitLine: { lineStyle: { color: '#edf0f5', type: 'dashed' } }
            },
            series: [{
                name: metric.field,
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 7,
                data: rows.map(function (row) {
                    var value = row[metric.field];
                    return value === null || value === undefined || value === ''
                        ? null
                        : Number(value);
                }),
                lineStyle: { width: 3 },
                itemStyle: { borderColor: '#fff', borderWidth: 2 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: metric.areaTop },
                            { offset: 1, color: metric.areaBottom }
                        ]
                    }
                }
            }]
        }, true);
        setChartState('ready');
    }

    function selectMetric(metricKey) {
        if (!metricDefinitions[metricKey]) {
            return;
        }
        activeMetric = metricKey;
        document.querySelectorAll('.metric-card[data-metric]').forEach(function (card) {
            var selected = card.dataset.metric === activeMetric;
            card.classList.toggle('is-active', selected);
            card.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        if (latestTrendResult) {
            renderTrend(latestTrendResult);
        }
    }

    function queryDashboard() {
        var filters = getFilters();
        var validationMessage = validateFilters(filters);
        if (validationMessage) {
            showMessage(validationMessage, 'info');
            return;
        }
        setButtonsDisabled(true);
        resetSummary();
        setChartState('loading');

        var summaryRequest = dataProvider.loadSummary(filters)
            .then(renderSummary)
            .catch(function (error) {
                resetSummary();
                console.error('汇总数据加载失败：', error);
                showMessage('采集统计数据加载失败，请稍后重试', 'error');
            });

        var trendRequest = dataProvider.loadTrend(filters)
            .then(renderTrend)
            .catch(function (error) {
                if (trendChart) {
                    trendChart.clear();
                }
                setChartState('empty');
                console.error('趋势数据加载失败：', error);
                showMessage('采集文件趋势加载失败，请稍后重试', 'error');
            });

        Promise.allSettled([summaryRequest, trendRequest]).then(function () {
            setButtonsDisabled(false);
        });
    }

    function resetQuery() {
        setDefaultDateRange();
        element('deviceSelect').value = '';
        queryDashboard();
    }

    function bindEvents() {
        element('queryButton').addEventListener('click', queryDashboard);
        element('resetButton').addEventListener('click', resetQuery);
        document.querySelectorAll('.metric-card[data-metric]').forEach(function (card) {
            card.addEventListener('click', function () {
                selectMetric(card.dataset.metric);
            });
            card.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectMetric(card.dataset.metric);
                }
            });
        });
        global.addEventListener('resize', function () {
            if (trendChart) {
                trendChart.resize();
            }
        });
    }

    function initialize() {
        if (typeof global.initGlobalParams === 'function') {
            global.initGlobalParams();
        }
        setDefaultDateRange();
        bindEvents();
        loadDeviceOptions().finally(queryDashboard);
    }

    global.addEventListener('load', initialize);
})(window);
