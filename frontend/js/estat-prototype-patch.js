/**
 * e-Stat Prototype Server Patch
 * Patches estat-integration.js to work with the prototype server on port 5099
 * 
 * This file should be loaded AFTER estat-integration.js
 */

(function() {
    'use strict';
    
    // Wait for estatIntegration to be available
    function applyPatch() {
        if (typeof window.estatIntegration === 'undefined') {
            console.warn('estatIntegration not found, retrying...');
            setTimeout(applyPatch, 100);
            return;
        }
        
        const estat = window.estatIntegration;
        
        // Patch 1: Change API endpoint to prototype server (port 5099)
        estat.apiEndpoint = 'http://localhost:5099/api';
        console.log('Patch 1 applied: API endpoint changed to port 5099');
        
        // Patch 2: Override searchStatistics to use correct endpoint
        estat.searchStatistics = async function() {
            const queryInput = document.getElementById('estat-search-input');
            const categorySelect = document.getElementById('estat-category-select');
            
            const query = queryInput ? queryInput.value : '';
            const category = categorySelect ? categorySelect.value : '';
            
            if (!query && !category) {
                alert('検索キーワードまたはカテゴリを選択してください');
                return;
            }
            
            try {
                const response = await fetch(this.apiEndpoint + '/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keyword: query, category: category })
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    this.displaySearchResults(data.results || []);
                } else {
                    console.error('Search failed:', data);
                    alert('検索中にエラーが発生しました');
                }
            } catch (error) {
                console.error('Search error:', error);
                alert('検索中にエラーが発生しました: ' + error.message);
            }
        };
        console.log('Patch 2 applied: searchStatistics overridden');
        
        // Patch 3: Override displaySearchResults to handle object-format titles
        estat.displaySearchResults = function(results) {
            const suggestions = document.getElementById('estat-suggestions');
            if (!suggestions) {
                console.error('estat-suggestions element not found');
                return;
            }
            suggestions.innerHTML = '';
            
            if (!results || results.length === 0) {
                suggestions.innerHTML = '<div style="padding: 10px; color: #666;">検索結果がありません</div>';
                suggestions.style.display = 'block';
                return;
            }
            
            results.slice(0, 10).forEach(function(stat) {
                // Handle e-Stat API response format where title may be an object
                var title;
                if (typeof stat.title === 'object' && stat.title !== null) {
                    title = stat.title['$'] || stat.title.$ || JSON.stringify(stat.title);
                } else {
                    title = stat.title || '無題';
                }
                
                var categoryText;
                if (typeof stat.category === 'object' && stat.category !== null) {
                    categoryText = stat.category['$'] || stat.category.$ || '';
                } else {
                    categoryText = stat.category || stat.category_name || '';
                }
                
                var org = stat.organization || '';
                
                var item = document.createElement('div');
                item.className = 'estat-suggestion-item';
                item.style.cssText = 'padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;';
                item.innerHTML = 
                    '<div style="font-weight: bold; color: #333;">' + title + '</div>' +
                    '<div style="font-size: 12px; color: #666;">' +
                        '<span>' + categoryText + '</span>' +
                        '<span style="margin-left: 8px;">' + org + '</span>' +
                    '</div>';
                
                item.onmouseover = function() { this.style.background = '#f5f5f5'; };
                item.onmouseout = function() { this.style.background = ''; };
                item.onclick = function() {
                    alert('統計ID: ' + stat.id + '\n' + title);
                };
                
                suggestions.appendChild(item);
            });
            
            suggestions.style.display = 'block';
        };
        console.log('Patch 3 applied: displaySearchResults overridden');

        // Patch 4: Also patch IntegratedMapView if it exists
        if (typeof window.mapView !== 'undefined' && window.mapView && window.mapView.estatAPI) {
            window.mapView.estatAPI = 'http://localhost:5099/api';
            console.log('Patch 4 applied: IntegratedMapView.estatAPI updated');
        } else {
            // Retry after a short delay for mapView to initialize
            setTimeout(function() {
                if (typeof window.mapView !== 'undefined' && window.mapView && window.mapView.estatAPI) {
                    window.mapView.estatAPI = 'http://localhost:5099/api';
                    console.log('Patch 4 applied (delayed): IntegratedMapView.estatAPI updated');
                }
            }, 2000);
        }
        
        // Patch 5: Override advancedSearch to work with prototype server
        estat.advancedSearch = async function() {
            console.log('🔍 advancedSearch called (patched version)');

            // 地域モードを取得
            var regionModeElem = document.querySelector('input[name="region-mode"]:checked');
            var regionMode = regionModeElem ? regionModeElem.value : 'national';
            var selectedRegions = [];

            if (regionMode === 'prefecture') {
                // 選択された都道府県を収集
                this.multipleSelections.regions.forEach(function(prefCode) {
                    selectedRegions.push(prefCode);
                });
            }

            // 指標を収集
            var selectedIndicators = [];
            var selectedCategories = Array.from(this.multipleSelections.categories);

            // カテゴリから指標名をマッピング
            var categoryToIndicator = {
                '02': 'population',  // 人口・世帯
                '03': 'employment',  // 労働・賃金
                '07': 'gdp',         // 企業・家計・経済
                '04': 'agriculture', // 農林水産業
                '01': 'area'         // 国土・気象
            };

            selectedCategories.forEach(function(cat) {
                var indicator = categoryToIndicator[cat] || 'population';
                if (selectedIndicators.indexOf(indicator) === -1) {
                    selectedIndicators.push(indicator);
                }
            });

            // デフォルト値
            if (selectedRegions.length === 0) {
                selectedRegions = ['13', '27'];  // 東京、大阪
            }
            if (selectedIndicators.length === 0) {
                selectedIndicators = ['population'];
            }

            var yearFromElem = document.getElementById('estat-year-from');
            var yearToElem = document.getElementById('estat-year-to');
            var yearFrom = yearFromElem && yearFromElem.value ? parseInt(yearFromElem.value) : 2020;
            var yearTo = yearToElem && yearToElem.value ? parseInt(yearToElem.value) : 2024;

            var searchParams = {
                regions: selectedRegions,
                indicators: selectedIndicators,
                yearFrom: yearFrom,
                yearTo: yearTo
            };

            console.log('📊 Advanced search params:', searchParams);

            try {
                var response = await fetch(this.apiEndpoint + '/statistics/cross-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(searchParams)
                });

                var data = await response.json();
                console.log('📈 Cross analysis response:', data);

                if (data.status === 'error') {
                    alert('詳細検索エラー: ' + (data.error || data.message || '不明なエラー'));
                    return;
                }

                // 結果を表示
                this.displayCrossAnalysisResults(data.results, data.summary);

                // 詳細検索パネルを閉じる
                var optionsElem = document.getElementById('estat-advanced-options');
                var iconElem = document.getElementById('advanced-toggle-icon');
                if (optionsElem) optionsElem.style.display = 'none';
                if (iconElem) iconElem.className = 'fas fa-chevron-down';

            } catch (error) {
                console.error('❌ Advanced search error:', error);
                alert('詳細検索中にエラーが発生しました: ' + error.message);
            }
        };
        console.log('Patch 5 applied: advancedSearch overridden for prototype server');

        // Patch 6: Override displayCrossAnalysisResults to handle prototype response
        estat.displayCrossAnalysisResults = function(results, summary) {
            console.log('📊 Displaying cross analysis results:', results);

            var suggestionsElem = document.getElementById('estat-suggestions');
            if (!suggestionsElem) {
                console.error('estat-suggestions element not found');
                return;
            }

            suggestionsElem.innerHTML = '';

            if (!results || Object.keys(results).length === 0) {
                suggestionsElem.innerHTML = '<div style="padding: 15px; text-align: center; color: #666;">クロス分析結果がありません</div>';
                suggestionsElem.style.display = 'block';
                return;
            }

            // 結果ヘッダー
            var headerDiv = document.createElement('div');
            headerDiv.style.cssText = 'padding: 10px; background: #4CAF50; color: white; font-weight: bold; border-radius: 4px 4px 0 0;';
            headerDiv.innerHTML = '<i class="fas fa-chart-bar"></i> クロス分析結果';
            suggestionsElem.appendChild(headerDiv);

            // 各地域の結果を表示
            Object.keys(results).forEach(function(regionCode) {
                var regionResult = results[regionCode];
                var regionName = regionResult.region_name || '不明な地域';
                var regionData = regionResult.data || {};

                var regionDiv = document.createElement('div');
                regionDiv.style.cssText = 'padding: 12px; border-bottom: 1px solid #eee; background: #fafafa;';

                var html = '<div style="font-weight: bold; color: #333; margin-bottom: 8px;">' +
                           '<i class="fas fa-map-marker-alt"></i> ' + regionName + ' (' + regionCode + ')' +
                           '</div>';

                // 各指標のデータを表示
                Object.keys(regionData).forEach(function(indicator) {
                    var indicatorData = regionData[indicator];
                    var indicatorName = indicatorData.name || indicator;
                    var dataPoints = indicatorData.data || [];
                    var unit = indicatorData.unit || '';

                    html += '<div style="margin-left: 16px; margin-bottom: 6px;">';
                    html += '<span style="color: #666;">' + indicatorName + ':</span> ';

                    if (dataPoints.length > 0) {
                        var latestData = dataPoints[dataPoints.length - 1];
                        var value = latestData.value || 0;
                        var formattedValue = value.toLocaleString('ja-JP');
                        html += '<span style="font-weight: bold; color: #2196F3;">' + formattedValue + ' ' + unit + '</span>';
                        html += ' <span style="font-size: 11px; color: #999;">(' + (latestData.year || '-') + '年)</span>';
                    } else {
                        html += '<span style="color: #999;">データなし</span>';
                    }

                    html += '</div>';
                });

                regionDiv.innerHTML = html;
                suggestionsElem.appendChild(regionDiv);
            });

            suggestionsElem.style.display = 'block';
        };
        console.log('Patch 6 applied: displayCrossAnalysisResults overridden');

        // 47都道府県の中心座標
        const PREFECTURE_CENTERS = {
            '01': { lat: 43.0646, lng: 141.3469, name: '北海道' },
            '02': { lat: 40.8244, lng: 140.7400, name: '青森県' },
            '03': { lat: 39.7036, lng: 141.1527, name: '岩手県' },
            '04': { lat: 38.2688, lng: 140.8721, name: '宮城県' },
            '05': { lat: 39.7186, lng: 140.1024, name: '秋田県' },
            '06': { lat: 38.2404, lng: 140.3633, name: '山形県' },
            '07': { lat: 37.7500, lng: 140.4678, name: '福島県' },
            '08': { lat: 36.3418, lng: 140.4468, name: '茨城県' },
            '09': { lat: 36.5657, lng: 139.8836, name: '栃木県' },
            '10': { lat: 36.3911, lng: 139.0608, name: '群馬県' },
            '11': { lat: 35.8569, lng: 139.6489, name: '埼玉県' },
            '12': { lat: 35.6047, lng: 140.1233, name: '千葉県' },
            '13': { lat: 35.6895, lng: 139.6917, name: '東京都' },
            '14': { lat: 35.4478, lng: 139.6425, name: '神奈川県' },
            '15': { lat: 37.9026, lng: 139.0236, name: '新潟県' },
            '16': { lat: 36.6953, lng: 137.2113, name: '富山県' },
            '17': { lat: 36.5946, lng: 136.6256, name: '石川県' },
            '18': { lat: 36.0652, lng: 136.2217, name: '福井県' },
            '19': { lat: 35.6642, lng: 138.5684, name: '山梨県' },
            '20': { lat: 36.6513, lng: 138.1810, name: '長野県' },
            '21': { lat: 35.3912, lng: 136.7223, name: '岐阜県' },
            '22': { lat: 34.9769, lng: 138.3831, name: '静岡県' },
            '23': { lat: 35.1802, lng: 136.9066, name: '愛知県' },
            '24': { lat: 34.7303, lng: 136.5086, name: '三重県' },
            '25': { lat: 35.0045, lng: 135.8686, name: '滋賀県' },
            '26': { lat: 35.0214, lng: 135.7556, name: '京都府' },
            '27': { lat: 34.6937, lng: 135.5023, name: '大阪府' },
            '28': { lat: 34.6913, lng: 135.1830, name: '兵庫県' },
            '29': { lat: 34.6851, lng: 135.8328, name: '奈良県' },
            '30': { lat: 34.2260, lng: 135.1675, name: '和歌山県' },
            '31': { lat: 35.5039, lng: 134.2378, name: '鳥取県' },
            '32': { lat: 35.4723, lng: 133.0505, name: '島根県' },
            '33': { lat: 34.6618, lng: 133.9344, name: '岡山県' },
            '34': { lat: 34.3966, lng: 132.4596, name: '広島県' },
            '35': { lat: 34.1860, lng: 131.4705, name: '山口県' },
            '36': { lat: 34.0657, lng: 134.5593, name: '徳島県' },
            '37': { lat: 34.3401, lng: 134.0434, name: '香川県' },
            '38': { lat: 33.8416, lng: 132.7657, name: '愛媛県' },
            '39': { lat: 33.5597, lng: 133.5311, name: '高知県' },
            '40': { lat: 33.6064, lng: 130.4183, name: '福岡県' },
            '41': { lat: 33.2494, lng: 130.2988, name: '佐賀県' },
            '42': { lat: 32.7448, lng: 129.8737, name: '長崎県' },
            '43': { lat: 32.7898, lng: 130.7417, name: '熊本県' },
            '44': { lat: 33.2382, lng: 131.6126, name: '大分県' },
            '45': { lat: 31.9111, lng: 131.4239, name: '宮崎県' },
            '46': { lat: 31.5602, lng: 130.5581, name: '鹿児島県' },
            '47': { lat: 26.2124, lng: 127.6809, name: '沖縄県' }
        };

        // Patch 7: Override visualizeOnMap to use cross-analysis API
        estat.visualizeOnMap = async function() {
            console.log('🗺️ visualizeOnMap called (patched version)');

            // 選択された都道府県を取得
            var selectedRegions = Array.from(this.multipleSelections.regions || []);
            if (selectedRegions.length === 0) {
                // デフォルト: 東京と大阪
                selectedRegions = ['13', '27'];
                console.log('📍 No regions selected, using defaults:', selectedRegions);
            }

            // 選択された指標を取得
            var selectedIndicators = [];
            var selectedCategories = Array.from(this.multipleSelections.categories || []);
            var categoryToIndicator = {
                '02': 'population',
                '03': 'employment',
                '07': 'gdp',
                '04': 'agriculture',
                '01': 'area'
            };
            selectedCategories.forEach(function(cat) {
                var indicator = categoryToIndicator[cat] || 'population';
                if (selectedIndicators.indexOf(indicator) === -1) {
                    selectedIndicators.push(indicator);
                }
            });
            if (selectedIndicators.length === 0) {
                selectedIndicators = ['population'];
            }

            var yearFromElem = document.getElementById('estat-year-from');
            var yearToElem = document.getElementById('estat-year-to');
            var yearFrom = yearFromElem && yearFromElem.value ? parseInt(yearFromElem.value) : 2020;
            var yearTo = yearToElem && yearToElem.value ? parseInt(yearToElem.value) : 2024;

            try {
                console.log('📊 Calling cross-analysis API for map visualization');
                var response = await fetch(this.apiEndpoint + '/statistics/cross-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        regions: selectedRegions,
                        indicators: selectedIndicators,
                        yearFrom: yearFrom,
                        yearTo: yearTo
                    })
                });

                var data = await response.json();
                console.log('📈 Cross analysis response for map:', data);

                if (data.status === 'error') {
                    alert('地図表示エラー: ' + (data.error || data.message || '不明なエラー'));
                    return;
                }

                // 地図にマーカーを表示
                this.displayRegionMarkers(data.results, PREFECTURE_CENTERS);

            } catch (error) {
                console.error('❌ Map visualization error:', error);
                alert('地図表示中にエラーが発生しました: ' + error.message);
            }
        };
        console.log('Patch 7 applied: visualizeOnMap overridden for map display');

        // Patch 8: Add displayRegionMarkers function
        estat.displayRegionMarkers = function(results, prefectureCenters) {
            console.log('📍 displayRegionMarkers called with results:', Object.keys(results));

            // 既存のマーカー/InfoWindowをクリア
            if (this.statisticsInfoWindows) {
                this.statisticsInfoWindows.forEach(function(iw) {
                    iw.close();
                });
            }
            this.statisticsInfoWindows = [];

            // mapViewが存在するか確認
            if (!window.mapView || !window.mapView.map) {
                console.error('❌ mapView or mapView.map not found');
                alert('地図が初期化されていません。ページをリロードしてください。');
                return;
            }

            var map = window.mapView.map;
            var self = this;
            var bounds = new google.maps.LatLngBounds();
            var hasData = false;

            Object.keys(results).forEach(function(regionCode) {
                var center = prefectureCenters[regionCode];
                if (!center) {
                    console.warn('⚠️ No center coordinates for region:', regionCode);
                    return;
                }

                var regionData = results[regionCode];
                var position = new google.maps.LatLng(center.lat, center.lng);
                bounds.extend(position);
                hasData = true;

                // InfoWindowを作成
                var infoWindow = new google.maps.InfoWindow({
                    content: self.createStatisticsPopup(regionData, center.name),
                    position: position,
                    maxWidth: 280
                });

                infoWindow.open(map);
                self.statisticsInfoWindows.push(infoWindow);
            });

            // 地図をズームして全マーカーが見えるようにする
            if (hasData) {
                map.fitBounds(bounds);
                // 最大ズームを制限
                var listener = google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
                    if (map.getZoom() > 10) {
                        map.setZoom(10);
                    }
                });
            }

            console.log('✅ Displayed', Object.keys(results).length, 'regions on map');
        };
        console.log('Patch 8 applied: displayRegionMarkers added');

        // Patch 9: Add createStatisticsPopup function
        estat.createStatisticsPopup = function(regionData, prefName) {
            var name = regionData.region_name || prefName || '不明';
            var dataObj = regionData.data || {};

            var html = '<div style="padding:10px;min-width:220px;font-family:sans-serif;">';
            html += '<h4 style="margin:0 0 10px 0;color:#333;border-bottom:2px solid #4CAF50;padding-bottom:5px;">';
            html += '<i class="fas fa-map-marker-alt" style="color:#4CAF50;margin-right:5px;"></i>' + name;
            html += '</h4>';

            var hasData = false;

            // 各指標のデータを表示
            Object.keys(dataObj).forEach(function(indicator) {
                var indicatorData = dataObj[indicator];
                if (!indicatorData || !indicatorData.data || indicatorData.data.length === 0) {
                    return;
                }

                hasData = true;
                var indicatorName = indicatorData.name || indicator;
                var latestData = indicatorData.data[indicatorData.data.length - 1];
                var value = latestData.value || 0;
                var unit = indicatorData.unit || '';
                var year = latestData.year || '-';
                var source = indicatorData.source || 'e-Stat';

                html += '<div style="margin-bottom:8px;">';
                html += '<div style="color:#666;font-size:12px;">' + indicatorName + '</div>';
                html += '<div style="font-size:18px;font-weight:bold;color:#2196F3;">';
                html += value.toLocaleString('ja-JP') + ' <span style="font-size:12px;font-weight:normal;">' + unit + '</span>';
                html += '</div>';
                html += '<div style="font-size:10px;color:#999;">' + year + '年 / ' + source + '</div>';
                html += '</div>';
            });

            if (!hasData) {
                html += '<div style="color:#999;text-align:center;padding:10px;">データなし</div>';
            }

            html += '</div>';
            return html;
        };
        console.log('Patch 9 applied: createStatisticsPopup added');

        console.log('✅ e-Stat prototype patch applied successfully (port 5099)');
    }

    // Start patching after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyPatch);
    } else {
        applyPatch();
    }
})();
