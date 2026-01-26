/**
 * Choropleth Layer - 統計データ地図可視化
 *
 * 機能:
 * - 都道府県別統計データの色分け表示
 * - 凡例・ツールチップ
 * - 指標・年度切替
 *
 * 2026-01-06 作成
 */

class ChoroplethLayer {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {
            apiBaseUrl: options.apiBaseUrl || 'http://localhost:5099',
            defaultIndicator: options.defaultIndicator || 'population',
            defaultYear: options.defaultYear || 2023,
            numClasses: options.numClasses || 5,
            classification: options.classification || 'quantile',
            ...options
        };

        this.markers = [];
        this.polygons = [];
        this.legend = null;
        this.tooltip = null;
        this.currentData = null;
        this.currentIndicator = this.options.defaultIndicator;
        this.currentYear = this.options.defaultYear;
        this.chartType = 'circle'; // 'circle', 'bar', or 'polygon'
        this.prefectureBoundaries = null; // ポリゴン境界データ
        this.lastError = null; // 最後のエラー情報

        // カラーパレット
        this.colorPalettes = {
            blue: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
            green: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
            red: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
            purple: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
            orange: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603']
        };

        // 指標別パレット選択
        this.indicatorPalettes = {
            population: 'blue',
            hospitals: 'blue',
            doctors: 'blue',
            gdp: 'green',
            land_area: 'green',
            forest_area: 'green',
            fire_incidents: 'red',
            traffic_accidents: 'red',
            crime_rate: 'red'
        };

        this._createTooltip();
    }

    /**
     * ツールチップ要素を作成
     */
    _createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'choropleth-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 13px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            max-width: 250px;
        `;
        document.body.appendChild(this.tooltip);
    }

    /**
     * 統計データを取得
     */
    async fetchChoroplethData(indicator, year) {
        const url = `${this.options.apiBaseUrl}/api/choropleth`;
        this.lastError = null; // エラーをリセット

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    indicator: indicator,
                    year: year,
                    classification: this.options.classification,
                    num_classes: this.options.numClasses
                })
            });

            const data = await response.json();

            // エラーレスポンスをチェック
            if (data.error || data.status === 'error') {
                this.lastError = {
                    message: data.error || 'Unknown error',
                    code: data.error_code || null,
                    indicator: indicator,
                    year: year
                };
                console.error('Choropleth API error:', this.lastError);
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            this.lastError = {
                message: error.message,
                code: 'FETCH_ERROR',
                indicator: indicator,
                year: year
            };
            console.error('Choropleth data fetch error:', error);
            return null;
        }
    }

    /**
     * チャートタイプを設定
     */
    setChartType(type) {
        if (type === 'bar') {
            this.chartType = 'bar';
        } else if (type === 'polygon') {
            this.chartType = 'polygon';
        } else {
            this.chartType = 'circle';
        }
    }

    /**
     * 都道府県境界ポリゴンデータを読み込み
     */
    async loadPrefectureBoundaries() {
        if (this.prefectureBoundaries) {
            return this.prefectureBoundaries;
        }

        try {
            const response = await fetch('/data/geojson/prefecture_boundaries.geojson');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            this.prefectureBoundaries = await response.json();
            return this.prefectureBoundaries;
        } catch (error) {
            console.error('Failed to load prefecture boundaries:', error);
            return null;
        }
    }

    /**
     * マップにChoroplethを描画
     */
    async render(indicator = null, year = null) {
        indicator = indicator || this.currentIndicator;
        year = year || this.currentYear;

        this.currentIndicator = indicator;
        this.currentYear = year;

        // 既存マーカーをクリア
        this.clearMarkers();

        // データ取得
        const data = await this.fetchChoroplethData(indicator, year);

        if (!data || data.error) {
            console.error('Failed to load choropleth data:', data?.error);
            return false;
        }

        this.currentData = data;

        // パレット選択
        const paletteName = this.indicatorPalettes[indicator] || 'blue';
        const colors = this.colorPalettes[paletteName];

        // ポリゴン表示の場合は別処理
        if (this.chartType === 'polygon') {
            return await this._renderPolygons(data, colors, indicator);
        }

        // 各都道府県にマーカーを配置（circle/bar）
        const features = data.geojson?.features || [];

        for (const feature of features) {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            const value = props[indicator];
            const classIdx = props.class;
            const color = classIdx >= 0 ? colors[classIdx] : '#cccccc';

            // チャートタイプに応じてマーカー作成
            let marker;
            if (this.chartType === 'bar') {
                marker = this._createBarMarker(coords, value, color, data.stats);
            } else {
                marker = this._createCircleMarker(coords, value, color, data.stats);
            }

            // ホバーイベント
            marker.addListener('mouseover', (e) => {
                this._showTooltip(e, props, indicator, data);
                if (this.chartType === 'bar') {
                    marker.setOptions({ strokeWeight: 2, fillOpacity: 0.95 });
                } else {
                    marker.setOptions({ strokeWeight: 3, fillOpacity: 0.9 });
                }
            });

            marker.addListener('mouseout', () => {
                this._hideTooltip();
                if (this.chartType === 'bar') {
                    marker.setOptions({ strokeWeight: 1, fillOpacity: 0.85 });
                } else {
                    marker.setOptions({ strokeWeight: 1, fillOpacity: 0.7 });
                }
            });

            // クリックイベント
            marker.addListener('click', () => {
                this._onMarkerClick(props, indicator);
            });

            this.markers.push(marker);
        }

        // 凡例を更新
        this._updateLegend(data.legend, data.stats, indicator);

        return true;
    }

    /**
     * ポリゴン（塗り分け地図）を描画
     */
    async _renderPolygons(data, colors, indicator) {
        // 境界データを読み込み
        const boundaries = await this.loadPrefectureBoundaries();
        if (!boundaries) {
            console.error('Failed to load prefecture boundaries');
            return false;
        }

        // 統計データをコードでマップ
        const statsMap = {};
        for (const feature of data.geojson?.features || []) {
            const code = feature.properties.code;
            statsMap[code] = feature.properties;
        }

        // 各都道府県ポリゴンを描画
        for (const boundaryFeature of boundaries.features) {
            const code = boundaryFeature.properties.code;
            const name = boundaryFeature.properties.name;
            const geometry = boundaryFeature.geometry;

            // 統計データを取得
            const stats = statsMap[code] || {};
            const value = stats[indicator];
            const classIdx = stats.class;
            const color = classIdx >= 0 ? colors[classIdx] : '#cccccc';

            // プロパティを結合
            const props = { ...boundaryFeature.properties, ...stats };

            // Polygon または MultiPolygon を処理
            const polygonCoords = this._extractPolygonPaths(geometry);

            for (const paths of polygonCoords) {
                const polygon = new google.maps.Polygon({
                    map: this.map,
                    paths: paths,
                    fillColor: color,
                    fillOpacity: 0.7,
                    strokeColor: '#333',
                    strokeWeight: 1,
                    strokeOpacity: 0.8
                });

                // ホバーイベント
                polygon.addListener('mouseover', (e) => {
                    this._showTooltip(e, props, indicator, data);
                    polygon.setOptions({ strokeWeight: 2, fillOpacity: 0.85 });
                });

                polygon.addListener('mouseout', () => {
                    this._hideTooltip();
                    polygon.setOptions({ strokeWeight: 1, fillOpacity: 0.7 });
                });

                // クリックイベント
                polygon.addListener('click', () => {
                    this._onMarkerClick(props, indicator);
                });

                this.polygons.push(polygon);
            }
        }

        // 凡例を更新
        this._updateLegend(data.legend, data.stats, indicator);

        return true;
    }

    /**
     * GeoJSONジオメトリからGoogle Maps用のパス配列を抽出
     */
    _extractPolygonPaths(geometry) {
        const result = [];
        const type = geometry.type;
        const coords = geometry.coordinates;

        if (type === 'Polygon') {
            // 外周のみ（穴は無視）
            const paths = coords[0].map(coord => ({
                lat: coord[1],
                lng: coord[0]
            }));
            result.push(paths);
        } else if (type === 'MultiPolygon') {
            // 複数ポリゴン（島など）
            for (const polygon of coords) {
                const paths = polygon[0].map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                }));
                result.push(paths);
            }
        }

        return result;
    }

    /**
     * サークルマーカーを作成
     */
    _createCircleMarker(coords, value, color, stats) {
        return new google.maps.Circle({
            map: this.map,
            center: { lat: coords[1], lng: coords[0] },
            radius: this._getRadius(value, stats),
            fillColor: color,
            fillOpacity: 0.7,
            strokeColor: '#333',
            strokeWeight: 1,
            strokeOpacity: 0.8
        });
    }

    /**
     * バーマーカー（3D風縦棒）を作成
     */
    _createBarMarker(coords, value, color, stats) {
        const barHeight = this._getBarHeight(value, stats);
        const barWidth = 0.15; // 経度方向の幅（度）

        // 棒の下部中心から上に伸びる矩形
        const centerLat = coords[1];
        const centerLng = coords[0];

        // 緯度方向の高さ（北に伸びる）
        const latHeight = barHeight * 0.008; // スケール調整

        const bounds = {
            north: centerLat + latHeight,
            south: centerLat,
            east: centerLng + barWidth / 2,
            west: centerLng - barWidth / 2
        };

        return new google.maps.Rectangle({
            map: this.map,
            bounds: bounds,
            fillColor: color,
            fillOpacity: 0.85,
            strokeColor: '#333',
            strokeWeight: 1,
            strokeOpacity: 0.9
        });
    }

    /**
     * 値に基づいて棒の高さを計算（正規化値 0-100）
     */
    _getBarHeight(value, stats) {
        if (!value || !stats) return 10;

        const min = stats.min;
        const max = stats.max;
        const range = max - min;

        if (range === 0) return 50;

        // 最小10〜最大100
        const normalized = (value - min) / range;
        return 10 + normalized * 90;
    }

    /**
     * 値に基づいて円の半径を計算
     */
    _getRadius(value, stats) {
        if (!value || !stats) return 15000;

        const min = stats.min;
        const max = stats.max;
        const range = max - min;

        if (range === 0) return 25000;

        // 最小15km〜最大60km
        const normalized = (value - min) / range;
        return 15000 + normalized * 45000;
    }

    /**
     * ツールチップを表示
     */
    _showTooltip(event, props, indicator, data) {
        const value = props[indicator];
        const year = props[`${indicator}_year`] || this.currentYear;
        const indicatorInfo = data.legend?.title || indicator;

        // 値のフォーマット
        let formattedValue = 'N/A';
        if (value !== null && value !== undefined) {
            formattedValue = Number(value).toLocaleString();
        }

        this.tooltip.innerHTML = `
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #333;">
                ${props.name}
            </div>
            <div style="color: #666;">
                <div style="margin-bottom: 4px;">
                    <span style="color: #888;">${indicatorInfo}:</span>
                    <span style="font-weight: 600; color: #333;">${formattedValue}</span>
                </div>
                <div style="font-size: 11px; color: #999;">
                    ${year}年データ
                </div>
            </div>
        `;

        // 位置計算
        const latLng = event.latLng || { lat: () => 0, lng: () => 0 };
        const point = this._latLngToPixel(latLng);

        this.tooltip.style.left = (point.x + 15) + 'px';
        this.tooltip.style.top = (point.y - 10) + 'px';
        this.tooltip.style.display = 'block';
    }

    /**
     * 緯度経度をピクセル座標に変換
     */
    _latLngToPixel(latLng) {
        const projection = this.map.getProjection();
        if (!projection) return { x: 0, y: 0 };

        const bounds = this.map.getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        const mapDiv = this.map.getDiv();
        const width = mapDiv.offsetWidth;
        const height = mapDiv.offsetHeight;

        const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
        const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

        const x = ((lng - sw.lng()) / (ne.lng() - sw.lng())) * width;
        const y = ((ne.lat() - lat) / (ne.lat() - sw.lat())) * height;

        const rect = mapDiv.getBoundingClientRect();
        return { x: rect.left + x, y: rect.top + y };
    }

    /**
     * ツールチップを非表示
     */
    _hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    /**
     * マーカークリック時の処理
     */
    _onMarkerClick(props, indicator) {
        console.log('Prefecture clicked:', props.name, props);

        // カスタムイベント発火
        const event = new CustomEvent('choropleth:click', {
            detail: { properties: props, indicator: indicator }
        });
        document.dispatchEvent(event);
    }

    /**
     * 凡例を更新
     */
    _updateLegend(legendData, stats, indicator) {
        if (this.legend) {
            this.legend.remove();
        }

        const legendDiv = document.createElement('div');
        legendDiv.className = 'choropleth-legend';
        legendDiv.style.cssText = `
            position: absolute;
            bottom: 30px;
            right: 10px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 12px;
            font-size: 12px;
            z-index: 100;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            min-width: 150px;
        `;

        // タイトル
        const title = document.createElement('div');
        title.style.cssText = 'font-weight: bold; margin-bottom: 8px; font-size: 13px; color: #333;';
        title.textContent = this._getIndicatorLabel(indicator);
        legendDiv.appendChild(title);

        // 凡例アイテム
        if (legendData && legendData.colors && legendData.labels) {
            for (let i = 0; i < legendData.colors.length; i++) {
                const item = document.createElement('div');
                item.style.cssText = 'display: flex; align-items: center; margin: 4px 0;';

                const colorBox = document.createElement('span');
                colorBox.style.cssText = `
                    display: inline-block;
                    width: 18px;
                    height: 18px;
                    background: ${legendData.colors[i]};
                    border: 1px solid #999;
                    margin-right: 8px;
                    border-radius: 3px;
                `;

                const label = document.createElement('span');
                label.style.cssText = 'color: #555;';
                label.textContent = legendData.labels[i];

                item.appendChild(colorBox);
                item.appendChild(label);
                legendDiv.appendChild(item);
            }
        }

        // 統計情報
        if (stats) {
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = 'margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px; color: #777;';
            statsDiv.innerHTML = `
                <div>Min: ${Number(stats.min).toLocaleString()}</div>
                <div>Max: ${Number(stats.max).toLocaleString()}</div>
                <div>平均: ${Number(stats.mean).toLocaleString()}</div>
            `;
            legendDiv.appendChild(statsDiv);
        }

        // マップコンテナまたはbodyに追加
        const mapDiv = this.map ? this.map.getDiv() : document.getElementById('map');
        if (mapDiv) {
            mapDiv.style.position = 'relative';
            mapDiv.appendChild(legendDiv);
        } else {
            document.body.appendChild(legendDiv);
        }
        this.legend = legendDiv;
    }

    /**
     * 指標IDから表示ラベルを取得
     */
    _getIndicatorLabel(indicator) {
        const labels = {
            population: '総人口',
            households: '世帯数',
            births: '出生数',
            deaths: '死亡数',
            hospitals: '病院数',
            doctors: '医師数',
            gdp: '県内総生産',
            land_area: '総面積',
            forest_area: '森林面積',
            fire_incidents: '火災件数',
            traffic_accidents: '交通事故件数'
        };
        return labels[indicator] || indicator;
    }

    /**
     * マーカーをクリア
     */
    clearMarkers() {
        // マーカーをクリア
        for (const marker of this.markers) {
            marker.setMap(null);
        }
        this.markers = [];

        // ポリゴンをクリア
        for (const polygon of this.polygons) {
            polygon.setMap(null);
        }
        this.polygons = [];
    }

    /**
     * 指標を変更
     */
    async setIndicator(indicator) {
        return await this.render(indicator, this.currentYear);
    }

    /**
     * 年度を変更
     */
    async setYear(year) {
        return await this.render(this.currentIndicator, year);
    }

    /**
     * 表示/非表示切替
     */
    setVisible(visible) {
        for (const marker of this.markers) {
            marker.setVisible(visible);
        }
        for (const polygon of this.polygons) {
            polygon.setVisible(visible);
        }
        if (this.legend) {
            this.legend.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * 破棄
     */
    destroy() {
        this.clearMarkers();
        if (this.legend) {
            this.legend.remove();
        }
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

// グローバルに公開
window.ChoroplethLayer = ChoroplethLayer;
