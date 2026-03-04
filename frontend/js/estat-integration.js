/**
 * e-Stat統計計算機の統合
 * integrated_view.htmlの統計データセクションを拡張
 */

// Security: escape HTML entities to prevent XSS
function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function escapeJsString(str) {
    if (str == null) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/</g, '\\x3c').replace(/>/g, '\\x3e');
}

class EStatIntegration {
    constructor() {
        this.apiEndpoint = 'http://localhost:5001/api';
        this.selectedStats = new Map();
        this.currentData = null;
        this.isExpanded = false;
        
        // 複数選択用のデータ構造
        this.multipleSelections = {
            regions: new Set(),      // 選択された都道府県
            cities: new Map(),       // 都道府県ごとの選択された市区町村
            categories: new Set(),   // 選択されたカテゴリ
            subcategories: new Map(), // カテゴリごとの選択されたサブカテゴリ
            items: new Map()         // サブカテゴリごとの選択された項目
        };
        
        // 17分野のカテゴリ定義
        this.categories = {
            "01": "国土・気象",
            "02": "人口・世帯", 
            "03": "労働・賃金",
            "04": "農林水産業",
            "05": "鉱工業",
            "06": "商業・サービス業",
            "07": "企業・家計・経済",
            "08": "住宅・土地・建設",
            "09": "エネルギー・水",
            "10": "運輸・観光",
            "11": "情報通信・科学技術",
            "12": "教育・文化・スポーツ・生活",
            "13": "行財政",
            "14": "司法・安全・環境",
            "15": "社会保障・衛生",
            "16": "国際統計",
            "17": "その他"
        };
        
        // カテゴリ別の細目（主要統計調査）
        this.categorySubItems = {
            "01": { // 国土・気象
                "国土": ["国土面積", "地価公示", "土地利用"],
                "気象": ["気温", "降水量", "日照時間", "台風"]
            },
            "02": { // 人口・世帯
                "国勢調査": ["総人口", "年齢別人口", "世帯数", "人口密度"],
                "人口動態": ["出生数", "死亡数", "婚姻数", "離婚数"],
                "住民基本台帳": ["転入転出", "外国人人口"]
            },
            "03": { // 労働・賃金
                "労働力調査": ["就業者数", "失業率", "雇用形態別"],
                "賃金構造": ["平均賃金", "初任給", "業種別賃金"],
                "毎月勤労統計": ["労働時間", "残業時間"]
            },
            "04": { // 農林水産業
                "農業センサス": ["農家数", "耕地面積", "農業就業人口"],
                "作物統計": ["米", "野菜", "果実"],
                "漁業センサス": ["漁獲量", "養殖業"]
            },
            "05": { // 鉱工業
                "工業統計": ["製造業事業所数", "従業者数", "製造品出荷額"],
                "生産動態": ["生産指数", "出荷指数", "在庫指数"]
            },
            "06": { // 商業・サービス業
                "商業統計": ["小売業", "卸売業", "販売額"],
                "サービス業": ["宿泊業", "飲食業", "情報サービス業"]
            },
            "07": { // 企業・家計・経済
                "GDP統計": ["国内総生産", "経済成長率"],
                "家計調査": ["消費支出", "収入", "貯蓄"],
                "法人企業統計": ["売上高", "経常利益", "設備投資"]
            },
            "08": { // 住宅・土地・建設
                "住宅・土地統計": ["住宅数", "空き家率", "持ち家率"],
                "建築着工": ["新設住宅", "建築物着工"]
            },
            "09": { // エネルギー・水
                "電力統計": ["発電量", "電力消費量"],
                "ガス・石油": ["都市ガス", "LPガス", "石油製品"]
            },
            "10": { // 運輸・観光
                "交通統計": ["鉄道", "自動車", "航空", "船舶"],
                "観光統計": ["訪日外国人", "日本人海外旅行", "宿泊者数"]
            },
            "11": { // 情報通信・科学技術
                "通信利用動向": ["インターネット利用", "携帯電話"],
                "科学技術研究": ["研究費", "研究者数", "特許"]
            },
            "12": { // 教育・文化・スポーツ・生活
                "学校基本調査": ["学校数", "在学者数", "教員数"],
                "社会生活基本調査": ["生活時間", "余暇活動"]
            },
            "13": { // 行財政
                "地方財政": ["歳入", "歳出", "地方税", "地方債"],
                "国家財政": ["国家予算", "税収"]
            },
            "14": { // 司法・安全・環境
                "犯罪統計": ["刑法犯", "交通事故"],
                "環境統計": ["大気質", "水質", "廃棄物"]
            },
            "15": { // 社会保障・衛生
                "医療統計": ["医療施設", "病床数", "医師数"],
                "社会保障": ["年金", "医療保険", "介護保険"]
            },
            "16": { // 国際統計
                "貿易統計": ["輸出", "輸入", "貿易収支"],
                "国際収支": ["経常収支", "直接投資"]
            },
            "17": { // その他
                "その他統計": ["各種調査", "特別調査"]
            }
        };
        
        // 主要都市リスト（都道府県コード別）
        this.majorCities = {
            "01": ["札幌市", "函館市", "旭川市", "釧路市", "帯広市", "北見市", "苫小牧市"],
            "02": ["青森市", "弘前市", "八戸市", "五所川原市", "十和田市", "三沢市", "むつ市"],
            "03": ["盛岡市", "一関市", "奥州市", "花巻市", "北上市", "宮古市", "大船渡市"],
            "04": ["仙台市", "石巻市", "大崎市", "登米市", "栗原市", "気仙沼市", "名取市"],
            "05": ["秋田市", "横手市", "大館市", "由利本荘市", "大仙市", "能代市", "湯沢市"],
            "06": ["山形市", "鶴岡市", "酒田市", "米沢市", "天童市", "東根市", "新庄市"],
            "07": ["福島市", "郡山市", "いわき市", "会津若松市", "須賀川市", "南相馬市", "伊達市"],
            "08": ["水戸市", "つくば市", "日立市", "ひたちなか市", "土浦市", "古河市", "取手市"],
            "09": ["宇都宮市", "小山市", "栃木市", "足利市", "佐野市", "日光市", "那須塩原市"],
            "10": ["前橋市", "高崎市", "伊勢崎市", "太田市", "桐生市", "渋川市", "館林市"],
            "11": ["さいたま市", "川口市", "川越市", "所沢市", "春日部市", "上尾市", "越谷市", "熊谷市", "新座市", "草加市"],
            "12": ["千葉市", "船橋市", "松戸市", "市川市", "柏市", "流山市", "八千代市", "浦安市", "習志野市", "佐倉市"],
            "13": ["特別区部", "八王子市", "立川市", "武蔵野市", "三鷹市", "府中市", "調布市", "町田市", "小金井市", "日野市"],
            "14": ["横浜市", "川崎市", "相模原市", "横須賀市", "平塚市", "藤沢市", "茅ヶ崎市", "厚木市", "大和市", "海老名市"],
            "15": ["新潟市", "長岡市", "上越市", "三条市", "新発田市", "柏崎市", "燕市"],
            "16": ["富山市", "高岡市", "射水市", "魚津市", "氷見市", "滑川市", "黒部市"],
            "17": ["金沢市", "小松市", "白山市", "加賀市", "野々市市", "七尾市", "能美市"],
            "18": ["福井市", "坂井市", "越前市", "鯖江市", "敦賀市", "大野市", "小浜市"],
            "19": ["甲府市", "甲斐市", "南アルプス市", "笛吹市", "富士吉田市", "山梨市", "中央市"],
            "20": ["長野市", "松本市", "上田市", "飯田市", "佐久市", "安曇野市", "伊那市"],
            "21": ["岐阜市", "大垣市", "各務原市", "多治見市", "可児市", "高山市", "関市"],
            "22": ["静岡市", "浜松市", "沼津市", "富士市", "磐田市", "藤枝市", "焼津市", "富士宮市"],
            "23": ["名古屋市", "豊田市", "岡崎市", "一宮市", "豊橋市", "春日井市", "安城市", "豊川市"],
            "24": ["津市", "四日市市", "鈴鹿市", "松阪市", "桑名市", "伊勢市", "伊賀市"],
            "25": ["大津市", "草津市", "長浜市", "東近江市", "彦根市", "甲賀市", "守山市"],
            "26": ["京都市", "宇治市", "亀岡市", "長岡京市", "舞鶴市", "福知山市", "城陽市"],
            "27": ["大阪市", "堺市", "東大阪市", "枚方市", "豊中市", "高槻市", "吹田市", "茨木市", "八尾市"],
            "28": ["神戸市", "姫路市", "西宮市", "尼崎市", "明石市", "加古川市", "宝塚市", "伊丹市"],
            "29": ["奈良市", "橿原市", "生駒市", "大和郡山市", "香芝市", "天理市", "大和高田市"],
            "30": ["和歌山市", "田辺市", "橋本市", "紀の川市", "海南市", "岩出市", "新宮市"],
            "31": ["鳥取市", "米子市", "倉吉市", "境港市"],
            "32": ["松江市", "出雲市", "浜田市", "益田市", "安来市", "雲南市", "大田市"],
            "33": ["岡山市", "倉敷市", "津山市", "総社市", "玉野市", "笠岡市", "真庭市"],
            "34": ["広島市", "福山市", "呉市", "東広島市", "尾道市", "廿日市市", "三原市"],
            "35": ["下関市", "山口市", "宇部市", "防府市", "岩国市", "周南市", "萩市"],
            "36": ["徳島市", "阿南市", "鳴門市", "吉野川市", "小松島市", "阿波市", "美馬市"],
            "37": ["高松市", "丸亀市", "坂出市", "観音寺市", "さぬき市", "東かがわ市", "三豊市"],
            "38": ["松山市", "今治市", "新居浜市", "西条市", "四国中央市", "宇和島市", "大洲市"],
            "39": ["高知市", "南国市", "四万十市", "香南市", "香美市", "土佐市", "宿毛市"],
            "40": ["福岡市", "北九州市", "久留米市", "飯塚市", "大牟田市", "春日市", "筑紫野市"],
            "41": ["佐賀市", "唐津市", "鳥栖市", "伊万里市", "武雄市", "小城市", "神埼市"],
            "42": ["長崎市", "佐世保市", "諫早市", "大村市", "島原市", "雲仙市", "南島原市"],
            "43": ["熊本市", "八代市", "天草市", "玉名市", "宇城市", "山鹿市", "菊池市"],
            "44": ["大分市", "別府市", "中津市", "日田市", "佐伯市", "臼杵市", "津久見市"],
            "45": ["宮崎市", "都城市", "延岡市", "日向市", "日南市", "小林市", "西都市"],
            "46": ["鹿児島市", "霧島市", "鹿屋市", "薩摩川内市", "姶良市", "出水市", "日置市"],
            "47": ["那覇市", "沖縄市", "うるま市", "浦添市", "名護市", "糸満市", "豊見城市"]
        };
        
        // 初期化
        this.init();
    }
    
    /**
     * 初期化
     */
    init() {
        // イベントリスナーの設定など
        console.log('EStatIntegration initialized');
    }
    
    /**
     * 数値をフォーマット
     */
    formatNumber(value) {
        if (value === null || value === undefined || value === '-' || isNaN(value)) {
            return '-';
        }
        // 小数点第2位まで表示
        const num = Number(value);
        if (Math.abs(num) >= 10000) {
            return num.toLocaleString('ja-JP', { maximumFractionDigits: 0 });
        } else if (Math.abs(num) >= 100) {
            return num.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
        } else {
            return num.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
        }
    }
    
    /**
     * 統計データセクションを拡張
     */
    enhanceStatisticsSection() {
        const sectionContent = document.querySelector('.layer-section:nth-child(4) .section-content');
        if (!sectionContent) return;
        
        // 既存のコンテンツをクリア
        sectionContent.innerHTML = '';
        
        // 検索バーを追加
        const searchBar = this.createSearchBar();
        sectionContent.appendChild(searchBar);
        
        // カテゴリ選択を追加（詳細検索内に移動したため、コメントアウト）
        // const categorySelector = this.createCategorySelector();
        // sectionContent.appendChild(categorySelector);
        
        // 選択された統計リスト
        const selectedList = this.createSelectedStatsList();
        sectionContent.appendChild(selectedList);
        
        // アクションボタン
        const actionButtons = this.createActionButtons();
        sectionContent.appendChild(actionButtons);
        
        // 詳細ビューパネル（初期は非表示）
        const detailPanel = this.createDetailPanel();
        sectionContent.appendChild(detailPanel);
    }
    
    /**
     * 検索バーを作成
     */
    createSearchBar() {
        const container = document.createElement('div');
        container.className = 'estat-search-container';
        container.innerHTML = `
            <div class="estat-search-bar">
                <input type="text" 
                       id="estat-search-input" 
                       class="estat-search-input" 
                       placeholder="統計データを検索... (例: 人口, GDP, 農業)">
                <button class="estat-search-btn" onclick="estatIntegration.searchStatistics()">
                    <i class="fas fa-search"></i>
                </button>
            </div>
            <div class="estat-suggestions" id="estat-suggestions"></div>
            
            <!-- 詳細検索オプション -->
            <div class="estat-advanced-search" id="estat-advanced-search">
                <button class="estat-toggle-advanced" onclick="estatIntegration.toggleAdvancedSearch()">
                    <i class="fas fa-filter"></i> 詳細検索
                    <i class="fas fa-chevron-down" id="advanced-toggle-icon"></i>
                </button>
                
                <div class="estat-advanced-options" id="estat-advanced-options" style="display: none;">
                    <!-- カテゴリ選択（複数選択対応） -->
                    <div class="estat-filter-group">
                        <label class="estat-filter-label">カテゴリ（複数選択可）:</label>
                        <div class="estat-selected-tags" id="selected-categories-tags"></div>
                        <select id="estat-category-select-advanced" class="estat-category-select">
                            <option value="">カテゴリを追加</option>
                            ${Object.entries(this.categories).map(([code, name]) => 
                                `<option value="${code}">${name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <!-- 選択されたカテゴリごとの統計調査・項目 -->
                    <div id="estat-subcategories-container" class="estat-subcategories-container"></div>
                    
                    <!-- 年度選択 -->
                    <div class="estat-filter-group">
                        <label class="estat-filter-label">年度:</label>
                        <div class="estat-year-selector">
                            <select id="estat-year-from" class="estat-year-select">
                                <option value="">開始年</option>
                                ${this.generateYearOptions(1990, 2025)}
                            </select>
                            <span class="estat-year-separator">〜</span>
                            <select id="estat-year-to" class="estat-year-select">
                                <option value="">終了年</option>
                                ${this.generateYearOptions(1990, 2025)}
                            </select>
                        </div>
                    </div>
                    
                    <!-- 地域選択（複数選択対応） -->
                    <div class="estat-filter-group">
                        <label class="estat-filter-label">地域（複数選択可）:</label>
                        <div class="estat-selection-mode">
                            <label class="estat-radio-label">
                                <input type="radio" name="region-mode" value="national" checked>
                                <span>全国</span>
                            </label>
                            <label class="estat-radio-label">
                                <input type="radio" name="region-mode" value="prefecture">
                                <span>都道府県選択</span>
                            </label>
                        </div>
                        
                        <!-- 都道府県複数選択（動的表示） -->
                        <div id="estat-prefecture-container" style="display: none;">
                            <div class="estat-selected-tags" id="selected-regions-tags"></div>
                            <select id="estat-prefecture-select" class="estat-prefecture-select">
                                <option value="">都道府県を追加</option>
                                ${this.generatePrefectureOptions()}
                            </select>
                            
                            <!-- 選択された都道府県ごとの市区町村選択 -->
                            <div id="estat-cities-container" class="estat-cities-container"></div>
                        </div>
                    </div>
                    
                    <!-- 統計の細目 -->
                    <div class="estat-filter-group">
                        <label class="estat-filter-label">細目:</label>
                        <div class="estat-detail-options">
                            <label class="estat-checkbox-label">
                                <input type="checkbox" id="estat-detail-age" value="age">
                                <span>年齢別</span>
                            </label>
                            <label class="estat-checkbox-label">
                                <input type="checkbox" id="estat-detail-gender" value="gender">
                                <span>性別</span>
                            </label>
                            <label class="estat-checkbox-label">
                                <input type="checkbox" id="estat-detail-industry" value="industry">
                                <span>産業別</span>
                            </label>
                            <label class="estat-checkbox-label">
                                <input type="checkbox" id="estat-detail-size" value="size">
                                <span>規模別</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 更新頻度 -->
                    <div class="estat-filter-group">
                        <label class="estat-filter-label">更新頻度:</label>
                        <select id="estat-cycle-select" class="estat-cycle-select">
                            <option value="">すべて</option>
                            <option value="monthly">月次</option>
                            <option value="quarterly">四半期</option>
                            <option value="yearly">年次</option>
                            <option value="5years">5年毎</option>
                        </select>
                    </div>
                    
                    <!-- 検索ボタン -->
                    <div class="estat-filter-actions">
                        <button class="estat-btn estat-btn-search" onclick="estatIntegration.advancedSearch()">
                            <i class="fas fa-search"></i> 詳細検索実行
                        </button>
                        <button class="estat-btn estat-btn-reset" onclick="estatIntegration.resetFilters()">
                            <i class="fas fa-redo"></i> リセット
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // スタイルを追加
        this.addStyles();
        
        // イベントリスナー
        container.querySelector('#estat-search-input').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.searchStatistics();
            } else {
                this.showSuggestions(e.target.value);
            }
        });
        
        // 地域モード選択の連動
        container.querySelectorAll('input[name="region-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const prefectureContainer = container.querySelector('#estat-prefecture-container');
                if (e.target.value === 'prefecture') {
                    prefectureContainer.style.display = 'block';
                } else {
                    prefectureContainer.style.display = 'none';
                    // 全国選択時は選択をクリア
                    this.multipleSelections.regions.clear();
                    this.multipleSelections.cities.clear();
                    this.updateSelectedRegionTags();
                }
            });
        });
        
        // 都道府県追加の連動
        container.querySelector('#estat-prefecture-select').addEventListener('change', (e) => {
            if (e.target.value) {
                this.addRegion(e.target.value);
                e.target.value = ''; // 選択をリセット
            }
        });
        
        // カテゴリ追加イベント
        container.querySelector('#estat-category-select-advanced').addEventListener('change', (e) => {
            if (e.target.value) {
                this.addCategory(e.target.value);
                e.target.value = ''; // 選択をリセット
            }
        });
        
        return container;
    }
    
    /**
     * カテゴリ選択を作成
     */
    createCategorySelector() {
        const container = document.createElement('div');
        container.className = 'estat-category-container';
        
        let html = '<div class="estat-category-label">カテゴリ別検索:</div>';
        html += '<select id="estat-category-select" class="estat-category-select">';
        html += '<option value="">全カテゴリ</option>';
        
        for (const [code, name] of Object.entries(this.categories)) {
            html += `<option value="${code}">${name}</option>`;
        }
        
        html += '</select>';
        
        // サブカテゴリ選択（初期は非表示）
        html += '<div id="estat-subcategory-container" style="display: none; margin-top: 10px;">';
        html += '<div class="estat-category-label">統計調査を選択:</div>';
        html += '<select id="estat-subcategory-select" class="estat-category-select">';
        html += '<option value="">すべての調査</option>';
        html += '</select>';
        html += '<div id="estat-sub-items" class="estat-sub-items" style="margin-top: 10px;"></div>';
        html += '</div>';
        
        container.innerHTML = html;
        
        // カテゴリ変更時のイベント
        container.querySelector('#estat-category-select').addEventListener('change', (e) => {
            this.onCategoryChange(e.target.value);
        });
        
        // サブカテゴリ変更時のイベント
        container.querySelector('#estat-subcategory-select').addEventListener('change', (e) => {
            this.onSubCategoryChange(e.target.value);
        });
        
        return container;
    }
    
    /**
     * カテゴリ変更時の処理
     */
    onCategoryChange(categoryCode) {
        const subcategoryContainer = document.getElementById('estat-subcategory-container');
        const subcategorySelect = document.getElementById('estat-subcategory-select');
        const subItemsDiv = document.getElementById('estat-sub-items');
        
        if (categoryCode && this.categorySubItems[categoryCode]) {
            // サブカテゴリがある場合は表示
            subcategoryContainer.style.display = 'block';
            
            // サブカテゴリのオプションを更新
            let html = '<option value="">すべての調査</option>';
            const subItems = this.categorySubItems[categoryCode];
            
            for (const [subCat, items] of Object.entries(subItems)) {
                html += `<option value="${escapeHtml(subCat)}">${escapeHtml(subCat)}</option>`;
            }

            subcategorySelect.innerHTML = html;
            subItemsDiv.innerHTML = '';
        } else {
            // サブカテゴリがない場合は非表示
            subcategoryContainer.style.display = 'none';
        }

        // カテゴリでフィルタリング
        this.filterByCategory(categoryCode);
    }

    /**
     * サブカテゴリ変更時の処理
     */
    onSubCategoryChange(subCategoryName) {
        const categoryCode = document.getElementById('estat-category-select').value;
        const subItemsDiv = document.getElementById('estat-sub-items');
        
        if (!categoryCode || !subCategoryName) {
            subItemsDiv.innerHTML = '';
            return;
        }
        
        const items = this.categorySubItems[categoryCode][subCategoryName];
        if (items) {
            // 細目項目をチェックボックスで表示
            let html = '<div class="estat-sub-items-label">詳細項目:</div>';
            html += '<div class="estat-sub-items-grid">';
            
            items.forEach((item, index) => {
                html += `
                    <label class="estat-checkbox-label">
                        <input type="checkbox" id="sub-item-${index}" value="${escapeHtml(item)}" class="estat-sub-item-checkbox">
                        <span>${escapeHtml(item)}</span>
                    </label>
                `;
            });
            
            html += '</div>';
            html += '<button class="estat-btn estat-btn-primary" style="margin-top: 10px; width: 100%;" onclick="estatIntegration.searchBySubItems()">選択項目で検索</button>';
            
            subItemsDiv.innerHTML = html;
        } else {
            subItemsDiv.innerHTML = '';
        }
    }
    
    /**
     * 細目項目で検索
     */
    searchBySubItems() {
        const categoryCode = document.getElementById('estat-category-select').value;
        const subCategory = document.getElementById('estat-subcategory-select').value;
        const checkedItems = Array.from(document.querySelectorAll('.estat-sub-item-checkbox:checked'))
            .map(cb => cb.value);
        
        if (checkedItems.length === 0) {
            alert('検索する項目を選択してください');
            return;
        }
        
        // 選択された項目でキーワード検索
        const query = checkedItems.join(' ');
        document.getElementById('estat-search-input').value = query;
        
        // 詳細検索を実行
        this.advancedSearchWithParams({
            query: query,
            category: categoryCode,
            subCategory: subCategory,
            items: checkedItems
        });
    }
    
    /**
     * 地域を追加
     */
    addRegion(prefectureCode) {
        this.multipleSelections.regions.add(prefectureCode);
        this.updateSelectedRegionTags();
        this.addCitySelector(prefectureCode);
    }
    
    /**
     * カテゴリを追加
     */
    addCategory(categoryCode) {
        this.multipleSelections.categories.add(categoryCode);
        this.updateSelectedCategoryTags();
        this.addSubcategorySelector(categoryCode);
    }
    
    /**
     * 選択された地域タグを更新
     */
    updateSelectedRegionTags() {
        const container = document.getElementById('selected-regions-tags');
        const prefectures = this.getPrefectureNames();
        
        let html = '';
        this.multipleSelections.regions.forEach(code => {
            const name = prefectures[parseInt(code) - 1];
            html += `
                <span class="estat-tag">
                    ${escapeHtml(name)}
                    <button class="estat-tag-remove" onclick="estatIntegration.removeRegion('${escapeJsString(code)}')">×</button>
                </span>
            `;
        });
        
        container.innerHTML = html;
    }
    
    /**
     * 選択されたカテゴリタグを更新
     */
    updateSelectedCategoryTags() {
        const container = document.getElementById('selected-categories-tags');
        
        let html = '';
        this.multipleSelections.categories.forEach(code => {
            const name = this.categories[code];
            html += `
                <span class="estat-tag">
                    ${escapeHtml(name)}
                    <button class="estat-tag-remove" onclick="estatIntegration.removeCategory('${escapeJsString(code)}')">×</button>
                </span>
            `;
        });
        
        container.innerHTML = html;
    }
    
    /**
     * 市区町村選択を追加
     */
    addCitySelector(prefectureCode) {
        const container = document.getElementById('estat-cities-container');
        const prefectures = this.getPrefectureNames();
        const prefectureName = prefectures[parseInt(prefectureCode) - 1];
        const cities = this.majorCities[prefectureCode] || [];
        
        // 既存の選択がある場合はスキップ
        if (document.getElementById(`city-selector-${prefectureCode}`)) return;
        
        const div = document.createElement('div');
        div.id = `city-selector-${prefectureCode}`;
        div.className = 'estat-city-selector-group';
        div.innerHTML = `
            <label class="estat-sub-label">${escapeHtml(prefectureName)}の市区町村（任意）:</label>
            <div class="estat-city-checkboxes">
                ${cities.map((city, index) => `
                    <label class="estat-checkbox-label">
                        <input type="checkbox" value="${escapeHtml(city)}" data-prefecture="${escapeHtml(prefectureCode)}" class="city-checkbox">
                        <span>${escapeHtml(city)}</span>
                    </label>
                `).join('')}
            </div>
        `;
        
        container.appendChild(div);
    }
    
    /**
     * サブカテゴリ選択を追加
     */
    addSubcategorySelector(categoryCode) {
        const container = document.getElementById('estat-subcategories-container');
        const categoryName = this.categories[categoryCode];
        const subItems = this.categorySubItems[categoryCode] || {};
        
        // 既存の選択がある場合はスキップ
        if (document.getElementById(`subcategory-selector-${categoryCode}`)) return;
        
        const div = document.createElement('div');
        div.id = `subcategory-selector-${categoryCode}`;
        div.className = 'estat-subcategory-selector-group';
        
        let html = `<label class="estat-sub-label">${escapeHtml(categoryName)}の詳細選択（任意）:</label>`;

        for (const [subCat, items] of Object.entries(subItems)) {
            html += `
                <div class="estat-subcategory-section">
                    <div class="estat-subcategory-name">${escapeHtml(subCat)}</div>
                    <div class="estat-item-checkboxes">
                        ${items.map((item, index) => `
                            <label class="estat-checkbox-label">
                                <input type="checkbox" value="${escapeHtml(item)}"
                                       data-category="${escapeHtml(categoryCode)}"
                                       data-subcategory="${escapeHtml(subCat)}"
                                       class="item-checkbox">
                                <span>${escapeHtml(item)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        div.innerHTML = html;
        container.appendChild(div);
    }
    
    /**
     * 地域を削除
     */
    removeRegion(prefectureCode) {
        this.multipleSelections.regions.delete(prefectureCode);
        this.multipleSelections.cities.delete(prefectureCode);
        this.updateSelectedRegionTags();
        
        // 市区町村選択を削除
        const selector = document.getElementById(`city-selector-${prefectureCode}`);
        if (selector) selector.remove();
    }
    
    /**
     * カテゴリを削除
     */
    removeCategory(categoryCode) {
        this.multipleSelections.categories.delete(categoryCode);
        this.multipleSelections.subcategories.delete(categoryCode);
        this.multipleSelections.items.delete(categoryCode);
        this.updateSelectedCategoryTags();
        
        // サブカテゴリ選択を削除
        const selector = document.getElementById(`subcategory-selector-${categoryCode}`);
        if (selector) selector.remove();
    }
    
    /**
     * 都道府県名リストを取得
     */
    getPrefectureNames() {
        return [
            "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
            "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
            "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
            "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府",
            "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県",
            "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県",
            "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
        ];
    }
    
    /**
     * 市区町村オプションを更新
     */
    updateCityOptions(prefectureCode) {
        const citySelect = document.getElementById('estat-city-select');
        const cities = this.majorCities[prefectureCode] || [];
        
        // 都道府県名を取得
        const prefectures = [
            "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
            "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
            "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
            "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府",
            "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県",
            "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県",
            "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
        ];
        const prefectureName = prefectures[parseInt(prefectureCode) - 1] || '';
        
        let html = `<option value="">すべての市区町村</option>`;
        if (cities.length > 0) {
            html += `<optgroup label="${escapeHtml(prefectureName)}の主要都市">`;
            cities.forEach(city => {
                html += `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`;
            });
            html += `</optgroup>`;
        }

        citySelect.innerHTML = html;
    }
    
    /**
     * 詳細検索内のカテゴリ変更時の処理
     */
    onCategoryChangeAdvanced(categoryCode) {
        const subcategoryContainer = document.getElementById('estat-subcategory-container-advanced');
        const subcategorySelect = document.getElementById('estat-subcategory-select-advanced');
        const subItemsDiv = document.getElementById('estat-sub-items-advanced');
        
        if (categoryCode && this.categorySubItems[categoryCode]) {
            // サブカテゴリがある場合は表示
            subcategoryContainer.style.display = 'block';
            
            // サブカテゴリのオプションを更新
            let html = '<option value="">すべての調査</option>';
            const subItems = this.categorySubItems[categoryCode];
            
            for (const [subCat, items] of Object.entries(subItems)) {
                html += `<option value="${escapeHtml(subCat)}">${escapeHtml(subCat)}</option>`;
            }

            subcategorySelect.innerHTML = html;
            subItemsDiv.innerHTML = '';
        } else {
            // サブカテゴリがない場合は非表示
            subcategoryContainer.style.display = 'none';
        }
    }

    /**
     * 詳細検索内のサブカテゴリ変更時の処理
     */
    onSubCategoryChangeAdvanced(subCategoryName) {
        const categoryCode = document.getElementById('estat-category-select-advanced').value;
        const subItemsDiv = document.getElementById('estat-sub-items-advanced');
        
        if (!categoryCode || !subCategoryName) {
            subItemsDiv.innerHTML = '';
            return;
        }
        
        const items = this.categorySubItems[categoryCode][subCategoryName];
        if (items) {
            // 細目項目をチェックボックスで表示
            let html = '<div class="estat-sub-items-grid">';
            
            items.forEach((item, index) => {
                html += `
                    <label class="estat-checkbox-label">
                        <input type="checkbox" id="sub-item-advanced-${index}" value="${escapeHtml(item)}" class="estat-sub-item-checkbox-advanced">
                        <span>${escapeHtml(item)}</span>
                    </label>
                `;
            });
            
            html += '</div>';
            
            subItemsDiv.innerHTML = html;
        } else {
            subItemsDiv.innerHTML = '';
        }
    }
    
    /**
     * パラメータを指定して詳細検索
     */
    async advancedSearchWithParams(params) {
        const searchParams = {
            query: params.query || document.getElementById('estat-search-input').value,
            category: params.category || document.getElementById('estat-category-select').value,
            yearFrom: document.getElementById('estat-year-from').value,
            yearTo: document.getElementById('estat-year-to').value,
            region: document.getElementById('estat-region-select').value,
            prefecture: document.getElementById('estat-prefecture-select').value,
            city: document.getElementById('estat-city-select').value,
            cycle: document.getElementById('estat-cycle-select').value,
            details: {
                age: document.getElementById('estat-detail-age').checked,
                gender: document.getElementById('estat-detail-gender').checked,
                industry: document.getElementById('estat-detail-industry').checked,
                size: document.getElementById('estat-detail-size').checked
            },
            subCategory: params.subCategory,
            items: params.items
        };
        
        try {
            const response = await fetch(`${this.apiEndpoint}/statistics/advanced-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchParams)
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                this.displaySearchResults(data.results);
            }
        } catch (error) {
            console.error('Advanced search error:', error);
            alert('詳細検索中にエラーが発生しました');
        }
    }
    
    /**
     * 選択された統計リスト
     */
    createSelectedStatsList() {
        const container = document.createElement('div');
        container.className = 'estat-selected-list';
        container.id = 'estat-selected-list';
        container.innerHTML = `
            <div class="estat-selected-header">
                <span>選択中の統計データ</span>
                <span class="estat-count">0件</span>
            </div>
            <div class="estat-selected-items"></div>
        `;
        return container;
    }
    
    /**
     * アクションボタン
     */
    createActionButtons() {
        const container = document.createElement('div');
        container.className = 'estat-action-buttons';
        container.innerHTML = `
            <button class="estat-btn estat-btn-primary" onclick="estatIntegration.visualizeOnMap()">
                <i class="fas fa-map"></i> 地図に表示
            </button>
            <button class="estat-btn estat-btn-secondary" onclick="estatIntegration.showDetailView()">
                <i class="fas fa-table"></i> 詳細表示
            </button>
            <button class="estat-btn estat-btn-export" onclick="estatIntegration.exportData()">
                <i class="fas fa-download"></i> 出力
            </button>
        `;
        return container;
    }
    
    /**
     * 詳細ビューパネル
     */
    createDetailPanel() {
        const panel = document.createElement('div');
        panel.className = 'estat-detail-panel';
        panel.id = 'estat-detail-panel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="estat-detail-header">
                <h4>統計データ詳細</h4>
                <button class="estat-close-btn" onclick="estatIntegration.closeDetailView()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="estat-detail-content">
                <div class="estat-detail-loading">
                    <i class="fas fa-spinner fa-spin"></i> 読み込み中...
                </div>
            </div>
        `;
        return panel;
    }
    
    /**
     * 年度オプションを生成
     */
    generateYearOptions(startYear, endYear) {
        let options = '';
        for (let year = endYear; year >= startYear; year--) {
            options += `<option value="${year}">${year}年</option>`;
        }
        return options;
    }
    
    /**
     * 都道府県オプションを生成
     */
    generatePrefectureOptions() {
        const prefectures = [
            "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
            "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
            "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
            "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府",
            "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県",
            "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県",
            "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
        ];
        
        return prefectures.map((pref, index) => {
            const code = String(index + 1).padStart(2, '0');
            return `<option value="${code}">${pref}</option>`;
        }).join('');
    }
    
    /**
     * 詳細検索の表示/非表示を切り替え
     */
    toggleAdvancedSearch() {
        const options = document.getElementById('estat-advanced-options');
        const icon = document.getElementById('advanced-toggle-icon');
        
        if (options.style.display === 'none') {
            options.style.display = 'block';
            icon.className = 'fas fa-chevron-up';
        } else {
            options.style.display = 'none';
            icon.className = 'fas fa-chevron-down';
        }
    }
    
    /**
     * 統計データを検索
     */
    async searchStatistics() {
        const query = document.getElementById('estat-search-input').value;
        const category = document.getElementById('estat-category-select').value;
        
        if (!query && !category) {
            alert('検索キーワードまたはカテゴリを選択してください');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiEndpoint}/statistics/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, category })
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                this.displaySearchResults(data.results);
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('検索中にエラーが発生しました');
        }
    }
    
    /**
     * 詳細検索を実行
     */
    async advancedSearch() {
        // 複数選択された地域を収集
        const regionMode = document.querySelector('input[name="region-mode"]:checked').value;
        const selectedRegions = [];
        const selectedCities = {};
        
        if (regionMode === 'prefecture') {
            this.multipleSelections.regions.forEach(prefCode => {
                selectedRegions.push(prefCode);
                // その都道府県で選択された市区町村を収集
                const cityCheckboxes = document.querySelectorAll(`#city-selector-${prefCode} .city-checkbox:checked`);
                const cities = Array.from(cityCheckboxes).map(cb => cb.value);
                if (cities.length > 0) {
                    selectedCities[prefCode] = cities;
                }
            });
        }
        
        // 複数選択されたカテゴリと項目を収集
        const selectedCategories = Array.from(this.multipleSelections.categories);
        const selectedItems = {};
        
        document.querySelectorAll('.item-checkbox:checked').forEach(cb => {
            const category = cb.dataset.category;
            const subcategory = cb.dataset.subcategory;
            const item = cb.value;
            
            if (!selectedItems[category]) {
                selectedItems[category] = {};
            }
            if (!selectedItems[category][subcategory]) {
                selectedItems[category][subcategory] = [];
            }
            selectedItems[category][subcategory].push(item);
        });
        
        const searchParams = {
            query: document.getElementById('estat-search-input').value,
            regionMode: regionMode,
            regions: selectedRegions,
            cities: selectedCities,
            categories: selectedCategories,
            items: selectedItems,
            yearFrom: document.getElementById('estat-year-from').value,
            yearTo: document.getElementById('estat-year-to').value,
            cycle: document.getElementById('estat-cycle-select').value,
            details: {
                age: document.getElementById('estat-detail-age').checked,
                gender: document.getElementById('estat-detail-gender').checked,
                industry: document.getElementById('estat-detail-industry').checked,
                size: document.getElementById('estat-detail-size').checked
            },
            useRealAPI: true  // リアルe-Stat APIを使用
        };
        
        try {
            // クロス分析APIを呼び出し
            const response = await fetch(`${this.apiEndpoint}/statistics/cross-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchParams)
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                // クロス分析結果を表示
                this.displayCrossAnalysisResults(data.crossData, data.summary);
                // 詳細検索パネルを閉じる
                document.getElementById('estat-advanced-options').style.display = 'none';
                document.getElementById('advanced-toggle-icon').className = 'fas fa-chevron-down';
            }
        } catch (error) {
            console.error('Advanced search error:', error);
            alert('詳細検索中にエラーが発生しました');
        }
    }
    
    /**
     * フィルターをリセット
     */
    resetFilters() {
        // 基本検索をリセット
        document.getElementById('estat-search-input').value = '';
        
        // 複数選択をクリア
        this.multipleSelections.regions.clear();
        this.multipleSelections.cities.clear();
        this.multipleSelections.categories.clear();
        this.multipleSelections.subcategories.clear();
        this.multipleSelections.items.clear();
        
        // UIをリセット
        document.getElementById('selected-regions-tags').innerHTML = '';
        document.getElementById('selected-categories-tags').innerHTML = '';
        document.getElementById('estat-cities-container').innerHTML = '';
        document.getElementById('estat-subcategories-container').innerHTML = '';
        
        // 地域モードをリセット
        document.querySelector('input[name="region-mode"][value="national"]').checked = true;
        document.getElementById('estat-prefecture-container').style.display = 'none';
        
        // その他のフィルターをリセット
        document.getElementById('estat-year-from').value = '';
        document.getElementById('estat-year-to').value = '';
        document.getElementById('estat-cycle-select').value = '';
        
        // チェックボックスをリセット
        document.getElementById('estat-detail-age').checked = false;
        document.getElementById('estat-detail-gender').checked = false;
        document.getElementById('estat-detail-industry').checked = false;
        document.getElementById('estat-detail-size').checked = false;
        
        // 検索候補をクリア
        document.getElementById('estat-suggestions').style.display = 'none';
    }
    
    /**
     * 検索結果を表示
     */
    displaySearchResults(results) {
        const suggestions = document.getElementById('estat-suggestions');
        suggestions.innerHTML = '';
        
        if (results.length === 0) {
            suggestions.innerHTML = '<div class="estat-no-results">検索結果がありません</div>';
            suggestions.style.display = 'block';
            return;
        }
        
        results.slice(0, 10).forEach(stat => {
            const item = document.createElement('div');
            item.className = 'estat-suggestion-item';
            item.innerHTML = `
                <div class="estat-stat-title">${escapeHtml(stat.title)}</div>
                <div class="estat-stat-meta">
                    <span class="estat-stat-category">${escapeHtml(stat.category)}</span>
                    <span class="estat-stat-org">${escapeHtml(stat.organization || '')}</span>
                </div>
            `;
            item.onclick = () => this.addStatistic(stat);
            suggestions.appendChild(item);
        });
        
        suggestions.style.display = 'block';
    }
    
    /**
     * 統計を選択リストに追加
     */
    addStatistic(stat) {
        if (this.selectedStats.has(stat.stat_id)) {
            alert('この統計は既に選択されています');
            return;
        }
        
        this.selectedStats.set(stat.stat_id, stat);
        this.updateSelectedList();
        
        // 検索候補を非表示
        document.getElementById('estat-suggestions').style.display = 'none';
        document.getElementById('estat-search-input').value = '';
    }
    
    /**
     * 選択リストを更新
     */
    updateSelectedList() {
        const itemsContainer = document.querySelector('.estat-selected-items');
        const countElement = document.querySelector('.estat-count');
        
        itemsContainer.innerHTML = '';
        countElement.textContent = `${this.selectedStats.size}件`;
        
        this.selectedStats.forEach((stat, id) => {
            const item = document.createElement('div');
            item.className = 'estat-selected-item';
            item.innerHTML = `
                <div class="estat-item-info">
                    <div class="estat-item-title">${escapeHtml(stat.title)}</div>
                    <div class="estat-item-category">${escapeHtml(stat.category)}</div>
                </div>
                <button class="estat-remove-btn" onclick="estatIntegration.removeStatistic('${escapeJsString(id)}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            itemsContainer.appendChild(item);
        });
        
        // 地図上の人口分布レイヤーと連動
        if (this.selectedStats.size > 0) {
            document.getElementById('layer-population').checked = true;
        }
    }
    
    /**
     * 統計を削除
     */
    removeStatistic(statId) {
        this.selectedStats.delete(statId);
        this.updateSelectedList();
    }
    
    /**
     * 地図に可視化
     */
    async visualizeOnMap() {
        if (this.selectedStats.size === 0) {
            alert('表示する統計データを選択してください');
            return;
        }
        
        // 選択された統計のデータを取得
        const statId = Array.from(this.selectedStats.keys())[0];
        
        try {
            const response = await fetch(`${this.apiEndpoint}/statistics/data/${statId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                // 地図に表示（MapViewとの連携）
                if (window.mapView) {
                    window.mapView.displayStatisticalData(data.data);
                }
                
                // 分析パネルを更新
                this.updateAnalysisPanel(data);
            }
        } catch (error) {
            console.error('Visualization error:', error);
            alert('データの可視化中にエラーが発生しました');
        }
    }
    
    /**
     * 詳細ビューを表示
     */
    showDetailView() {
        if (this.selectedStats.size === 0) {
            alert('表示する統計データを選択してください');
            return;
        }
        
        const panel = document.getElementById('estat-detail-panel');
        panel.style.display = 'block';
        
        // アニメーション
        setTimeout(() => {
            panel.classList.add('active');
        }, 10);
        
        this.loadDetailData();
    }
    
    /**
     * 詳細データを読み込み
     */
    async loadDetailData() {
        const content = document.querySelector('.estat-detail-content');
        content.innerHTML = '<div class="estat-detail-loading"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</div>';
        
        // 最初の統計データを取得
        const statId = Array.from(this.selectedStats.keys())[0];
        
        try {
            const response = await fetch(`${this.apiEndpoint}/statistics/data/${statId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.displayDetailData(data);
            }
        } catch (error) {
            console.error('Detail load error:', error);
            content.innerHTML = '<div class="estat-error">データの読み込みに失敗しました</div>';
        }
    }
    
    /**
     * 詳細データを表示
     */
    displayDetailData(data) {
        const content = document.querySelector('.estat-detail-content');
        
        let html = '<div class="estat-data-table">';
        html += '<table>';
        html += '<thead><tr>';
        
        // ヘッダー
        data.columns.forEach(col => {
            html += `<th>${escapeHtml(col)}</th>`;
        });
        html += '</tr></thead>';

        // データ行（最初の20行）
        html += '<tbody>';
        data.data.slice(0, 20).forEach(row => {
            html += '<tr>';
            data.columns.forEach(col => {
                html += `<td>${escapeHtml(row[col] || '-')}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        
        if (data.data.length > 20) {
            html += `<div class="estat-more-data">他 ${data.data.length - 20} 件のデータ</div>`;
        }
        
        html += '</div>';
        
        content.innerHTML = html;
    }
    
    /**
     * 詳細ビューを閉じる
     */
    closeDetailView() {
        const panel = document.getElementById('estat-detail-panel');
        panel.classList.remove('active');
        
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
    
    /**
     * データをエクスポート
     */
    async exportData() {
        if (this.selectedStats.size === 0) {
            alert('エクスポートする統計データを選択してください');
            return;
        }
        
        // エクスポート形式を選択
        const format = prompt('エクスポート形式を選択してください:\n1. CSV\n2. Excel\n3. JSON\n4. GeoJSON', '1');
        
        const formatMap = {
            '1': 'csv',
            '2': 'excel',
            '3': 'json',
            '4': 'geojson'
        };
        
        const selectedFormat = formatMap[format] || 'csv';
        
        // データをエクスポート
        const statId = Array.from(this.selectedStats.keys())[0];
        
        try {
            // まずデータを取得
            const dataResponse = await fetch(`${this.apiEndpoint}/statistics/data/${statId}`);
            const data = await dataResponse.json();
            
            if (data.status === 'success') {
                // エクスポート実行
                const response = await fetch(`${this.apiEndpoint}/statistics/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: data.data,
                        format: selectedFormat,
                        metadata: {
                            stats_id: statId,
                            title: this.selectedStats.get(statId).title
                        }
                    })
                });
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `statistics.${selectedFormat}`;
                a.click();
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('エクスポート中にエラーが発生しました');
        }
    }
    
    /**
     * クロス分析結果を表示
     */
    displayCrossAnalysisResults(crossData, summary) {
        // データを保存
        this.currentCrossData = crossData || {};
        this.currentSummary = summary || {
            regionCount: 0,
            indicatorCount: 0,
            dataPoints: 0
        };
        
        // デバッグ用ログ
        console.log('Cross analysis data received:', this.currentCrossData);
        console.log('Summary:', this.currentSummary);
        console.log('Regions in data:', Object.keys(this.currentCrossData.regions || {}));
        console.log('Region details:', this.currentCrossData.regions);
        
        // ポップアップウィンドウで表示
        this.createStatisticsPopup();
    }
    
    /**
     * 統計分析結果用のポップアップウィンドウを作成
     */
    createStatisticsPopup() {
        // デフォルト値を設定
        if (!this.currentSummary) {
            this.currentSummary = {
                regionCount: 0,
                indicatorCount: 0,
                dataPoints: 0
            };
        }
        
        // 既存のポップアップがあれば削除
        const existingPopup = document.getElementById('estat-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // ポップアップコンテナを作成
        const popup = document.createElement('div');
        popup.id = 'estat-popup';
        popup.className = 'estat-popup';
        popup.innerHTML = `
            <div class="estat-popup-header">
                <h3>📊 e-Stat統計分析結果</h3>
                <div class="popup-controls">
                    <button class="popup-btn minimize-btn" title="最小化">_</button>
                    <button class="popup-btn maximize-btn" title="最大化">□</button>
                    <button class="popup-btn close-btn" title="閉じる">×</button>
                </div>
            </div>
            <div class="estat-popup-content">
                <div class="cross-analysis-summary">
                    <h4>クロス分析結果</h4>
                    <p>地域数: ${this.currentSummary.regionCount} | 指標数: ${this.currentSummary.indicatorCount} | データポイント: ${this.currentSummary.dataPoints}</p>
                    <div class="display-mode-selector">
                        <label>表示形式:</label>
                        <button class="estat-btn estat-btn-small active" onclick="estatIntegration.showMatrixView()">
                            <i class="fas fa-table"></i> マトリックス
                        </button>
                        <button class="estat-btn estat-btn-small" onclick="estatIntegration.showChartView()">
                            <i class="fas fa-chart-line"></i> グラフ
                        </button>
                        <button class="estat-btn estat-btn-small" onclick="estatIntegration.showDashboardView()">
                            <i class="fas fa-th-large"></i> ダッシュボード
                        </button>
                    </div>
                </div>
                <div id="analysis-view-container" class="analysis-view-container"></div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // ポップアップのドラッグ機能
        this.makePopupDraggable(popup);
        
        // コントロールボタンのイベント
        popup.querySelector('.close-btn').addEventListener('click', () => {
            popup.remove();
        });
        
        popup.querySelector('.minimize-btn').addEventListener('click', () => {
            popup.classList.toggle('minimized');
        });
        
        popup.querySelector('.maximize-btn').addEventListener('click', () => {
            popup.classList.toggle('maximized');
        });
        
        // デフォルトでマトリックス表示
        this.showMatrixView();
    }
    
    /**
     * ポップアップをドラッグ可能にする
     */
    makePopupDraggable(popup) {
        const header = popup.querySelector('.estat-popup-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        function dragStart(e) {
            if (e.target.closest('.popup-controls')) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target === header || e.target.parentElement === header) {
                isDragging = true;
                popup.style.cursor = 'move';
            }
        }
        
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                xOffset = currentX;
                yOffset = currentY;
                
                popup.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }
        
        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            popup.style.cursor = 'default';
        }
    }
    
    /**
     * 表示モードボタンのアクティブ状態を更新
     */
    updateDisplayModeButtons(activeMode) {
        document.querySelectorAll('.display-mode-selector button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const modeIndex = {
            'matrix': 0,
            'chart': 1,
            'dashboard': 2
        };
        
        const buttons = document.querySelectorAll('.display-mode-selector button');
        if (buttons[modeIndex[activeMode]]) {
            buttons[modeIndex[activeMode]].classList.add('active');
        }
    }
    
    /**
     * データがない場合のメッセージ表示
     */
    showNoDataMessage() {
        const container = document.getElementById('analysis-view-container');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                    <p style="font-size: 18px;">データがありません</p>
                    <p style="font-size: 14px; margin-top: 10px;">
                        検索条件を指定して、統計データを検索してください。
                    </p>
                </div>
            `;
        }
    }
    
    /**
     * マトリックス表示
     */
    showMatrixView() {
        this.updateDisplayModeButtons('matrix');
        const container = document.getElementById('analysis-view-container');
        const data = this.currentCrossData;
        
        // デバッグ用ログ
        console.log('ShowMatrixView - data structure:', data);
        
        if (!data || !data.regions || !data.indicators) {
            console.error('Cross data is incomplete:', data);
            this.showNoDataMessage();
            return;
        }
        
        // 地域と指標のリスト
        const regions = Object.keys(data.regions);
        const indicators = Object.keys(data.indicators);
        
        // 利用可能な年度を取得
        const years = this.getAvailableYears(data);
        const latestYear = years[years.length - 1];
        
        let html = '<div class="matrix-view">';
        
        // 年度セレクターとコントロール
        html += `
            <div class="matrix-controls">
                <div class="year-selector">
                    <label>表示年度:</label>
                    <select id="matrix-year-select" onchange="estatIntegration.updateMatrixYear(this.value)">
                        ${years.map(year => `<option value="${year}" ${year === latestYear ? 'selected' : ''}>${year}年</option>`).join('')}
                    </select>
                </div>
                <div class="view-options">
                    <label>
                        <input type="checkbox" id="show-sparklines" onchange="estatIntegration.toggleSparklines(this.checked)">
                        時系列スパークライン表示
                    </label>
                </div>
            </div>
        `;
        
        html += '<table class="cross-analysis-matrix" id="matrix-table">';
        
        // ヘッダー行
        html += '<thead>';
        // 指標名行
        html += '<tr><th rowspan="2">地域/指標</th>';
        indicators.forEach(indicator => {
            const info = data.indicators[indicator];
            const displayName = info.name || info.item || indicator;
            const tooltipText = info.statsId ? `統計表ID: ${info.statsId}` : '';
            html += `<th title="${tooltipText}">${displayName}</th>`;
        });
        html += '</tr>';
        // 単位行
        html += '<tr>';
        indicators.forEach(indicator => {
            const info = data.indicators[indicator];
            const unit = info.unit || '-';
            html += `<th class="unit-header">（${unit}）</th>`;
        });
        html += '</tr>';
        html += '</thead>';
        
        // データ行
        html += '<tbody>';
        regions.forEach(region => {
            const regionInfo = data.regions[region];
            const regionName = regionInfo ? regionInfo.name : region;
            html += `<tr><th>${regionName}</th>`;
            indicators.forEach(indicator => {
                const cellData = data.data[region]?.[indicator];
                
                // データ構造を確認して値を取得
                let displayValue = '-';
                if (cellData && typeof cellData === 'object') {
                    // 年度別データの場合
                    if (latestYear && cellData[latestYear] !== undefined) {
                        displayValue = this.formatNumber(cellData[latestYear]);
                    } else {
                        // 最新のデータを取得
                        const years = Object.keys(cellData).sort();
                        if (years.length > 0) {
                            displayValue = this.formatNumber(cellData[years[years.length - 1]]);
                        }
                    }
                } else if (cellData !== undefined && cellData !== null) {
                    displayValue = this.formatNumber(cellData);
                }
                
                html += `<td class="data-cell" data-region="${region}" data-indicator="${indicator}">
                    <div class="cell-content">
                        <div class="cell-value">${displayValue}</div>
                    </div>
                </td>`;
            
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        
        container.innerHTML = html;
        
        // 現在の年度を保存
        this.currentMatrixYear = latestYear;
        
        // セルクリックイベント
        container.querySelectorAll('.data-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (!e.target.closest('.cell-sparkline')) {
                    const region = e.currentTarget.dataset.region;
                    const indicator = e.currentTarget.dataset.indicator;
                    this.showDetailModal(region, indicator);
                }
            });
        });
    }
    
    /**
     * 利用可能な年度を取得
     */
    getAvailableYears(data) {
        const yearsSet = new Set();
        
        // timeRangeから年度を取得
        if (data && data.timeRange) {
            const startYear = parseInt(data.timeRange.from) || 2020;
            const endYear = parseInt(data.timeRange.to) || 2024;
            for (let year = startYear; year <= endYear; year++) {
                yearsSet.add(year.toString());
            }
        }
        
        // データから年度を取得
        if (data && data.data) {
            Object.values(data.data).forEach(regionData => {
                if (regionData && typeof regionData === 'object') {
                    Object.values(regionData).forEach(indicatorData => {
                        // 直接年度がキーになっている場合
                        if (indicatorData && typeof indicatorData === 'object') {
                            Object.keys(indicatorData).forEach(key => {
                                // 年度として解釈できるキーを追加
                                if (/^\d{4}$/.test(key)) {
                                    yearsSet.add(key);
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // デフォルト年度を追加（データがない場合）
        if (yearsSet.size === 0) {
            yearsSet.add('2021');
            yearsSet.add('2022');
            yearsSet.add('2023');
        }
        
        return Array.from(yearsSet).sort();
    }
    
    /**
     * マトリックスの年度を更新
     */
    updateMatrixYear(year) {
        this.currentMatrixYear = year;
        const data = this.currentCrossData;
        const tbody = document.querySelector('#matrix-table tbody');
        
        if (!tbody || !data) return;
        
        // 各セルの値を更新
        tbody.querySelectorAll('.data-cell').forEach(cell => {
            const region = cell.dataset.region;
            const indicator = cell.dataset.indicator;
            const cellData = data.data[region]?.[indicator];
            
            let displayValue = '-';
            if (cellData && typeof cellData === 'object') {
                // 指定年度のデータを取得
                if (cellData[year] !== undefined) {
                    displayValue = this.formatNumber(cellData[year]);
                }
            }
            
            cell.querySelector('.cell-value').textContent = displayValue;
        });
    }
    
    /**
     * スパークラインの表示切り替え
     */
    toggleSparklines(show) {
        const sparklines = document.querySelectorAll('.cell-sparkline');
        sparklines.forEach(sparkline => {
            sparkline.style.display = show ? 'block' : 'none';
            if (show && !sparkline.hasChildNodes()) {
                // スパークラインを描画
                const data = JSON.parse(sparkline.dataset.sparkline);
                this.drawSparkline(sparkline, data);
            }
        });
    }
    
    /**
     * スパークライン用データ準備
     */
    prepareSparklineData(values, data) {
        if (!values) return [];
        
        // 配列形式の場合
        if (Array.isArray(values)) {
            const startYear = parseInt(data?.timeRange?.from) || 2020;
            return values.map((value, index) => ({
                year: (startYear + index).toString(),
                value: parseFloat(value) || 0
            }));
        }
        
        // オブジェクト形式の場合
        if (typeof values === 'object') {
            const sortedEntries = Object.entries(values).sort((a, b) => a[0].localeCompare(b[0]));
            return sortedEntries.map(([year, value]) => ({
                year,
                value: parseFloat(value) || 0
            }));
        }
        
        return [];
    }
    
    /**
     * スパークラインを描画
     */
    drawSparkline(container, data) {
        if (data.length < 2) return;
        
        const width = 80;
        const height = 30;
        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.display = 'block';
        
        // ポイントを計算
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * (width - 4) + 2;
            const y = height - ((d.value - min) / range) * (height - 4) - 2;
            return `${x},${y}`;
        }).join(' ');
        
        // 折れ線を描画
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#3b82f6');
        polyline.setAttribute('stroke-width', '2');
        
        // 最後のポイントに点を追加
        const lastPoint = data[data.length - 1];
        const lastX = width - 2;
        const lastY = height - ((lastPoint.value - min) / range) * (height - 4) - 2;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', lastX);
        circle.setAttribute('cy', lastY);
        circle.setAttribute('r', '3');
        circle.setAttribute('fill', '#3b82f6');
        
        svg.appendChild(polyline);
        svg.appendChild(circle);
        container.appendChild(svg);
    }
    
    /**
     * グラフ表示
     */
    showChartView() {
        this.updateDisplayModeButtons('chart');
        const container = document.getElementById('analysis-view-container');
        const data = this.currentCrossData;
        
        if (!data || !data.regions || !data.indicators) {
            console.error('Cross data is incomplete:', data);
            this.showNoDataMessage();
            return;
        }
        
        // グラフビューのコンテナを作成
        let html = '<div class="chart-view">';
        
        // グラフ設定コントロール
        html += `
            <div class="chart-controls">
                <div class="chart-type-selector">
                    <label>グラフ種類:</label>
                    <select id="chart-type-select" onchange="estatIntegration.updateCharts()">
                        <option value="line">折れ線グラフ</option>
                        <option value="bar">棒グラフ</option>
                        <option value="horizontalBar">横棒グラフ</option>
                        <option value="pie">円グラフ（最新年）</option>
                    </select>
                </div>
                <div class="chart-view-selector">
                    <label>表示方法:</label>
                    <select id="chart-view-select" onchange="estatIntegration.changeChartView()">
                        <option value="by-indicator">指標別（全地域比較）</option>
                        <option value="by-region">地域別（全指標表示）</option>
                        <option value="time-series">時系列（指標×地域）</option>
                        <option value="custom">カスタム（軸を自由選択）</option>
                    </select>
                </div>
            </div>
        `;
        
        // グラフコンテナ
        html += '<div id="charts-container" class="charts-grid"></div>';
        html += '</div>';
        
        container.innerHTML = html;
        
        // デフォルトビューを表示
        this.changeChartView();
    }
    
    /**
     * ダッシュボード表示
     */
    showDashboardView() {
        this.updateDisplayModeButtons('dashboard');
        const container = document.getElementById('analysis-view-container');
        const data = this.currentCrossData;
        
        if (!data || !data.regions || !data.indicators) {
            console.error('Cross data is incomplete:', data);
            this.showNoDataMessage();
            return;
        }
        
        const regions = Object.keys(data.regions);
        const latestYear = data.timeRange?.to || new Date().getFullYear().toString();
        
        let html = '<div class="dashboard-view">';
        
        // 地域ごとのカード
        regions.forEach(region => {
            const regionInfo = data.regions[region];
            const regionName = regionInfo ? regionInfo.name : region;
            html += `
                <div class="region-card">
                    <h5>${regionName}</h5>
                    <div class="region-stats">
            `;
            
            // 各指標の値を表示
            Object.keys(data.indicators).forEach(indicator => {
                const indicatorInfo = data.indicators[indicator];
                const displayName = indicatorInfo.name || indicatorInfo.item || indicator;
                const unit = indicatorInfo.unit || '';
                const cellData = data.data[region]?.[indicator];
                
                let displayValue = '-';
                if (cellData && typeof cellData === 'object') {
                    // 最新年のデータを取得
                    if (cellData[latestYear] !== undefined) {
                        displayValue = this.formatNumber(cellData[latestYear]);
                    } else {
                        // 最新のデータを取得
                        const years = Object.keys(cellData).sort();
                        if (years.length > 0) {
                            displayValue = this.formatNumber(cellData[years[years.length - 1]]);
                        }
                    }
                }
                
                html += `
                    <div class="stat-item">
                        <span class="stat-label">${displayName}:</span>
                        <span class="stat-value">${displayValue}</span>
                        <span class="stat-unit">（${unit}）</span>
                    </div>
                `;
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    /**
     * 詳細モーダルを表示
     */
    showDetailModal(region, indicator) {
        const data = this.currentCrossData;
        const cellData = data.data[region]?.[indicator];
        const indicatorInfo = data.indicators[indicator];
        const regionInfo = data.regions[region];
        const regionName = regionInfo ? regionInfo.name : region;
        const displayName = indicatorInfo.name || indicatorInfo.item || indicator;
        
        if (!cellData) return;
        
        // モーダルHTMLを作成
        const modalHtml = `
            <div class="estat-modal-overlay" onclick="estatIntegration.closeModal()">
                <div class="estat-modal" onclick="event.stopPropagation()">
                    <div class="estat-modal-header">
                        <h4>${regionName} - ${displayName}</h4>
                        <button class="estat-close-btn" onclick="estatIntegration.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="estat-modal-body">
                        <p>統計表ID: ${indicatorInfo.statsId || 'N/A'}</p>
                        <h5>時系列データ</h5>
                        <table class="time-series-table">
                            <thead>
                                <tr>
                                    <th>年</th>
                                    <th>値</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(cellData.values).map(([year, value]) => `
                                    <tr>
                                        <td>${year}</td>
                                        <td>${value}${cellData.unit}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // モーダルを表示
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    /**
     * モーダルを閉じる
     */
    closeModal() {
        const modal = document.querySelector('.estat-modal-overlay');
        if (modal) modal.remove();
    }
    
    /**
     * 年度に対応する値を取得（配列とオブジェクト両方に対応）
     */
    getValueForYear(values, year, data) {
        if (!values) return null;
        
        // values がオブジェクトの場合（年度がキー）
        if (typeof values === 'object' && !Array.isArray(values)) {
            return values[year];
        }
        
        // values が配列の場合（インデックスで管理）
        if (Array.isArray(values)) {
            const startYear = parseInt(data?.timeRange?.from) || 2020;
            const targetYear = parseInt(year);
            const index = targetYear - startYear;
            
            if (index >= 0 && index < values.length) {
                return values[index];
            }
        }
        
        return null;
    }
    
    /**
     * グラフ表示方法を変更
     */
    changeChartView() {
        const viewType = document.getElementById('chart-view-select')?.value;
        const chartType = document.getElementById('chart-type-select')?.value;
        const container = document.getElementById('charts-container');
        const data = this.currentCrossData;
        
        if (!data || !data.regions || !data.indicators) {
            console.error('Cross data is incomplete for chart view:', data);
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: #666;">データがありません</p>';
            }
            return;
        }
        
        // カスタムチャート設定UIの表示/非表示を管理
        this.manageCustomChartConfig(viewType);
        
        let html = '';
        
        switch(viewType) {
            case 'by-indicator':
                // 指標別表示（各指標について全地域を比較）
                Object.entries(data.indicators).forEach(([indicatorKey, indicatorInfo]) => {
                    const displayName = indicatorInfo.name || indicatorInfo.item || indicatorKey;
                    html += `
                        <div class="chart-wrapper">
                            <h5>${displayName}</h5>
                            <canvas id="chart-${indicatorKey.replace(/[^a-zA-Z0-9]/g, '-')}"></canvas>
                        </div>
                    `;
                });
                break;
                
            case 'by-region':
                // 地域別表示（各地域について全指標を表示）
                Object.entries(data.regions).forEach(([regionName, regionInfo]) => {
                    html += `
                        <div class="chart-wrapper">
                            <h5>${regionName}</h5>
                            <canvas id="chart-region-${regionName.replace(/[^a-zA-Z0-9]/g, '-')}"></canvas>
                        </div>
                    `;
                });
                break;
                
            case 'time-series':
                // 時系列表示（指標×地域の組み合わせ）
                const regions = Object.keys(data.regions);
                const indicators = Object.keys(data.indicators);
                
                // 最初の指標について全地域の時系列
                if (indicators.length > 0) {
                    const firstIndicator = indicators[0];
                    const indicatorInfo = data.indicators[firstIndicator];
                    html += `
                        <div class="chart-wrapper large">
                            <h5>${indicatorInfo.item}の時系列変化</h5>
                            <canvas id="chart-timeseries-main"></canvas>
                        </div>
                    `;
                }
                
                // 各地域の主要指標
                regions.slice(0, 3).forEach((region, idx) => {
                    html += `
                        <div class="chart-wrapper">
                            <h5>${region}の各指標</h5>
                            <canvas id="chart-timeseries-${idx}"></canvas>
                        </div>
                    `;
                });
                break;
                
            case 'custom':
                // カスタム表示（軸を自由に選択）
                html = '<div id="custom-chart-container"><canvas id="customChart"></canvas></div>';
                break;
        }
        
        container.innerHTML = html;
        
        // グラフを描画
        setTimeout(() => {
            if (viewType === 'custom') {
                // カスタムチャートの初回描画
                this.updateCustomChart();
            } else {
                this.drawCharts(viewType, chartType);
            }
        }, 100);
    }
    
    /**
     * グラフを更新
     */
    updateCharts() {
        const viewType = document.getElementById('chart-view-select').value;
        const chartType = document.getElementById('chart-type-select').value;
        this.drawCharts(viewType, chartType);
    }
    
    /**
     * Chart.jsを使用してグラフを描画
     */
    drawCharts(viewType, chartType) {
        const data = this.currentCrossData;
        if (!data) return;
        
        // Chart.jsがロードされているか確認
        if (typeof Chart === 'undefined') {
            this.loadChartJS().then(() => {
                this.drawCharts(viewType, chartType);
            });
            return;
        }
        
        switch(viewType) {
            case 'by-indicator':
                this.drawIndicatorCharts(data, chartType);
                break;
            case 'by-region':
                this.drawRegionCharts(data, chartType);
                break;
            case 'time-series':
                this.drawTimeSeriesCharts(data, chartType);
                break;
        }
    }
    
    /**
     * カスタムグラフを更新
     */
    updateCustomChart() {
        const data = this.currentCrossData;
        if (!data) return;
        
        // 選択値を取得（新しいIDに対応）
        const xAxis = document.getElementById('customXAxis')?.value || document.getElementById('x-axis-select')?.value || 'region';
        const yAxis = document.getElementById('customYAxis')?.value || document.getElementById('y-axis-select')?.value || 'value';
        const groupBy = document.getElementById('customGroupBy')?.value || document.getElementById('group-by-select')?.value || '';
        const chartType = document.getElementById('chart-type-select')?.value || 'bar';
        
        // フィルターを取得（新しいIDに対応）
        let regionFilter = Array.from(document.getElementById('customRegionFilter')?.selectedOptions || 
                                      document.getElementById('region-filter')?.selectedOptions || []).map(o => o.value);
        let indicatorFilter = Array.from(document.getElementById('customIndicatorFilter')?.selectedOptions || 
                                         document.getElementById('indicator-filter')?.selectedOptions || []).map(o => o.value);
        let yearFilter = Array.from(document.getElementById('customYearFilter')?.selectedOptions || 
                                    document.getElementById('year-filter')?.selectedOptions || []).map(o => o.value);
        
        // フィルターが空の場合はすべてのデータを使用
        if (regionFilter.length === 0) {
            regionFilter = Object.keys(data.regions);
        }
        if (indicatorFilter.length === 0) {
            indicatorFilter = Object.keys(data.indicators);
        }
        if (yearFilter.length === 0) {
            yearFilter = this.getAvailableYears(data);
        }
        
        // Chart.jsがロードされているか確認
        if (typeof Chart === 'undefined') {
            this.loadChartJS().then(() => {
                this.updateCustomChart();
            });
            return;
        }
        
        // カスタムグラフを描画
        this.drawCustomChart(xAxis, yAxis, groupBy, chartType, {
            regions: regionFilter,
            indicators: indicatorFilter,
            years: yearFilter
        });
    }
    
    /**
     * カスタムグラフを描画
     */
    drawCustomChart(xAxis, yAxis, groupBy, chartType, filters) {
        const canvas = document.getElementById('customChart') || document.getElementById('chart-custom');
        if (!canvas) {
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const data = this.currentCrossData;
        
        // 既存のチャートを破棄
        if (window.customChartInstance) {
            window.customChartInstance.destroy();
        }
        
        // データを準備
        const chartData = this.prepareCustomChartData(xAxis, yAxis, groupBy, filters, data);
        
        // タイトルを更新
        const titleElement = document.getElementById('custom-chart-title');
        if (titleElement) {
            titleElement.textContent = this.generateCustomChartTitle(xAxis, yAxis, groupBy, filters);
        }
        
        // この部分は削除（既に上で破棄処理を行っている）
        
        // 新しいチャートを作成
        window.customChartInstance = new Chart(ctx, {
            type: chartType === 'pie' ? 'pie' : chartType,
            data: chartData,
            options: this.getCustomChartOptions(chartType, xAxis, yAxis)
        });
    }
    
    /**
     * カスタムグラフ用データを準備
     */
    prepareCustomChartData(xAxis, yAxis, groupBy, filters, data) {
        let labels = [];
        let datasets = [];
        
        // X軸に応じたラベルを生成
        switch(xAxis) {
            case 'region':
                labels = filters.regions;
                break;
            case 'indicator':
                labels = filters.indicators.map(key => data.indicators[key]?.item || key);
                break;
            case 'year':
                labels = filters.years.map(y => `${y}年`);
                break;
        }
        
        // グループ化に応じてデータセットを生成
        if (!groupBy) {
            // グループ化なし - 単一のデータセット
            const values = this.collectCustomChartValues(xAxis, filters, data);
            datasets.push({
                label: 'データ',
                data: values,
                backgroundColor: this.getChartColors(values.length),
                borderColor: this.getChartColors(values.length, true),
                borderWidth: 1
            });
        } else {
            // グループ化あり - 複数のデータセット
            const groups = this.getGroupItems(groupBy, filters, data);
            
            groups.forEach((group, idx) => {
                const values = this.collectCustomChartValues(xAxis, filters, data, groupBy, group);
                datasets.push({
                    label: this.getGroupLabel(groupBy, group, data),
                    data: values,
                    backgroundColor: this.getChartColors(groups.length)[idx],
                    borderColor: this.getChartColors(groups.length, true)[idx],
                    borderWidth: 1,
                    fill: false
                });
            });
        }
        
        return { labels, datasets };
    }
    
    /**
     * カスタムグラフの値を収集
     */
    collectCustomChartValues(xAxis, filters, data, groupBy = null, groupItem = null) {
        const values = [];
        
        // X軸の各項目について値を収集
        const xItems = xAxis === 'region' ? filters.regions :
                       xAxis === 'indicator' ? filters.indicators :
                       filters.years;
        
        xItems.forEach(xItem => {
            let value = 0;
            let count = 0;
            
            // フィルター条件に基づいて値を集計
            filters.regions.forEach(region => {
                filters.indicators.forEach(indicator => {
                    filters.years.forEach(year => {
                        // グループフィルターを適用
                        if (groupBy === 'region' && groupItem !== region) return;
                        if (groupBy === 'indicator' && groupItem !== indicator) return;
                        if (groupBy === 'year' && groupItem !== year) return;
                        
                        // X軸フィルターを適用
                        if (xAxis === 'region' && xItem !== region) return;
                        if (xAxis === 'indicator' && xItem !== indicator) return;
                        if (xAxis === 'year' && xItem !== year) return;
                        
                        // 値を取得
                        const cellData = data.data[region]?.[indicator];
                        if (cellData?.values?.[year]) {
                            value += parseFloat(cellData.values[year]) || 0;
                            count++;
                        }
                    });
                });
            });
            
            // 平均値を計算（複数の値がある場合）
            values.push(count > 0 ? value / count : 0);
        });
        
        return values;
    }
    
    /**
     * グループ項目を取得
     */
    getGroupItems(groupBy, filters, data) {
        switch(groupBy) {
            case 'region':
                return filters.regions;
            case 'indicator':
                return filters.indicators;
            case 'year':
                return filters.years;
            default:
                return [];
        }
    }
    
    /**
     * グループラベルを取得
     */
    getGroupLabel(groupBy, groupItem, data) {
        switch(groupBy) {
            case 'region':
                return groupItem;
            case 'indicator':
                return data.indicators[groupItem]?.item || groupItem;
            case 'year':
                return `${groupItem}年`;
            default:
                return groupItem;
        }
    }
    
    /**
     * カスタムグラフのタイトルを生成
     */
    generateCustomChartTitle(xAxis, yAxis, groupBy, filters) {
        const xLabel = xAxis === 'region' ? '地域' : xAxis === 'indicator' ? '指標' : '年度';
        const groupLabel = groupBy ? `（${groupBy === 'region' ? '地域' : groupBy === 'indicator' ? '指標' : '年度'}別）` : '';
        
        return `${xLabel}別データ${groupLabel}`;
    }
    
    /**
     * カスタムグラフのオプションを取得
     */
    getCustomChartOptions(type, xAxis, yAxis) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false // タイトルは外部で管理
                },
                legend: {
                    display: true,
                    labels: {
                        color: '#e2e8f0'
                    }
                }
            }
        };
        
        if (type !== 'pie') {
            baseOptions.scales = {
                x: {
                    ticks: { 
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#94a3b8'
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            };
        }
        
        return baseOptions;
    }
    
    /**
     * 指標別グラフを描画
     */
    drawIndicatorCharts(data, chartType) {
        Object.entries(data.indicators).forEach(([indicatorKey, indicatorInfo]) => {
            const canvasId = `chart-${indicatorKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const regions = Object.keys(data.regions);
            const regionNames = regions.map(r => data.regions[r].name || r);
            
            // 最新年のデータを取得
            const latestYear = this.getAvailableYears(data).slice(-1)[0];
            const values = [];
            let hasValidData = false;
            
            regions.forEach(region => {
                const cellData = data.data[region]?.[indicatorKey];
                if (cellData && typeof cellData === 'object') {
                    const value = cellData[latestYear];
                    if (value !== undefined && value !== null) {
                        values.push(value);
                        hasValidData = true;
                    } else {
                        values.push(0);
                    }
                } else {
                    values.push(0);
                }
            });
            
            // すべてがエラーの場合はグラフを描画しない
            if (!hasValidData) {
                const displayName = indicatorInfo.name || indicatorInfo.item || indicatorKey;
                canvas.parentElement.innerHTML = `
                    <div class="chart-error">
                        <p>${escapeHtml(displayName)}</p>
                        <p style="color: #ef4444; font-size: 12px;">データ取得エラー</p>
                    </div>
                `;
                return;
            }
            
            // 単位を取得
            const unit = indicatorInfo.unit || '';
            const displayName = indicatorInfo.name || indicatorInfo.item || indicatorKey;
            
            // 既存のチャートを破棄
            if (window[`chart_${canvasId}`]) {
                window[`chart_${canvasId}`].destroy();
            }
            
            window[`chart_${canvasId}`] = new Chart(ctx, {
                type: chartType === 'pie' ? 'pie' : chartType,
                data: {
                    labels: regionNames,
                    datasets: [{
                        label: `${displayName} (${unit})`,
                        data: values,
                        backgroundColor: this.getChartColors(regions.length),
                        borderColor: this.getChartColors(regions.length, true),
                        borderWidth: 1
                    }]
                },
                options: this.getChartOptions(chartType, displayName, unit)
            });
        });
    }
    
    /**
     * 地域別グラフを描画
     */
    drawRegionCharts(data, chartType) {
        Object.entries(data.regions).forEach(([regionName, regionInfo]) => {
            const canvasId = `chart-region-${regionName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const indicators = Object.keys(data.indicators);
            
            // 最新年のデータを取得
            const latestYear = this.getAvailableYears(data).slice(-1)[0];
            const values = indicators.map(indicator => {
                const cellData = data.data[regionName][indicator];
                return cellData?.values?.[latestYear] || 0;
            });
            
            // ラベルを作成
            const labels = indicators.map(indicator => {
                const info = data.indicators[indicator];
                return info.item;
            });
            
            new Chart(ctx, {
                type: chartType === 'pie' ? 'pie' : chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: regionName,
                        data: values,
                        backgroundColor: this.getChartColors(indicators.length),
                        borderColor: this.getChartColors(indicators.length, true),
                        borderWidth: 1
                    }]
                },
                options: this.getChartOptions(chartType, regionName, '各指標')
            });
        });
    }
    
    /**
     * 時系列グラフを描画
     */
    drawTimeSeriesCharts(data, chartType) {
        const regions = Object.keys(data.regions);
        const indicators = Object.keys(data.indicators);
        const years = this.getAvailableYears(data);
        
        // メインの時系列グラフ（最初の指標について全地域）
        if (indicators.length > 0) {
            const canvas = document.getElementById('chart-timeseries-main');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const indicatorKey = indicators[0];
                const indicatorInfo = data.indicators[indicatorKey];
                
                const datasets = regions.map((region, idx) => {
                    const values = years.map(year => {
                        const cellData = data.data[region][indicatorKey];
                        return cellData?.values?.[year] || 0;
                    });
                    
                    return {
                        label: region,
                        data: values,
                        borderColor: this.getChartColors(regions.length, true)[idx],
                        backgroundColor: this.getChartColors(regions.length)[idx],
                        fill: false,
                        tension: 0.1
                    };
                });
                
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: years.map(y => `${y}年`),
                        datasets: datasets
                    },
                    options: this.getChartOptions('line', indicatorInfo.item, data.data[regions[0]][indicatorKey]?.unit || '')
                });
            }
        }
        
        // 各地域の指標グラフ
        regions.slice(0, 3).forEach((region, idx) => {
            const canvas = document.getElementById(`chart-timeseries-${idx}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                
                const datasets = indicators.slice(0, 4).map((indicator, i) => {
                    const values = years.map(year => {
                        const cellData = data.data[region][indicator];
                        return cellData?.values?.[year] || 0;
                    });
                    
                    const info = data.indicators[indicator];
                    return {
                        label: info.item,
                        data: values,
                        borderColor: this.getChartColors(4, true)[i],
                        backgroundColor: this.getChartColors(4)[i],
                        fill: false,
                        tension: 0.1
                    };
                });
                
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: years.map(y => `${y}年`),
                        datasets: datasets
                    },
                    options: this.getChartOptions('line', region, '各指標')
                });
            }
        });
    }
    
    /**
     * グラフのカラーパレットを取得
     */
    getChartColors(count, border = false) {
        const colors = [
            'rgba(59, 130, 246, 0.8)',  // Blue
            'rgba(16, 185, 129, 0.8)',  // Green
            'rgba(251, 146, 60, 0.8)',   // Orange
            'rgba(236, 72, 153, 0.8)',   // Pink
            'rgba(147, 51, 234, 0.8)',   // Purple
            'rgba(250, 204, 21, 0.8)',   // Yellow
            'rgba(239, 68, 68, 0.8)',    // Red
            'rgba(14, 165, 233, 0.8)'    // Sky
        ];
        
        if (border) {
            return colors.map(c => c.replace('0.8', '1')).slice(0, count);
        }
        
        return colors.slice(0, count);
    }
    
    /**
     * グラフオプションを取得
     */
    getChartOptions(type, title, unit) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    color: '#e2e8f0'
                },
                legend: {
                    labels: {
                        color: '#e2e8f0'
                    }
                }
            }
        };
        
        if (type !== 'pie') {
            baseOptions.scales = {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(value) {
                            return value + (unit ? ` ${unit}` : '');
                        }
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            };
        }
        
        return baseOptions;
    }
    
    /**
     * Chart.jsを動的に読み込み
     */
    loadChartJS() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 分析パネルを更新
     */
    updateAnalysisPanel(data) {
        // 推定人口を更新
        const populationElement = document.getElementById('estimated-population');
        if (populationElement && data.data.length > 0) {
            // 人口データを集計
            let totalPopulation = 0;
            data.data.forEach(row => {
                if (row['人口'] || row['population'] || row['value']) {
                    totalPopulation += parseFloat(row['人口'] || row['population'] || row['value'] || 0);
                }
            });
            
            populationElement.textContent = totalPopulation.toLocaleString() + ' 人';
        }
        
        // データソースを更新
        const sourceElement = document.getElementById('data-source');
        if (sourceElement) {
            const stat = Array.from(this.selectedStats.values())[0];
            sourceElement.textContent = stat.title;
        }
    }
    
    /**
     * スタイルを追加
     */
    addStyles() {
        if (document.getElementById('estat-integration-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'estat-integration-styles';
        style.innerHTML = `
            .estat-search-container {
                margin-bottom: 15px;
            }
            
            .estat-search-bar {
                display: flex;
                gap: 5px;
            }
            
            .estat-search-input {
                flex: 1;
                padding: 8px 12px;
                background: rgba(30, 41, 59, 0.5);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 6px;
                color: white;
                font-size: 13px;
            }
            
            .estat-search-btn {
                padding: 8px 12px;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
            }
            
            .estat-suggestions {
                position: absolute;
                background: rgba(15, 23, 42, 0.98);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 6px;
                margin-top: 5px;
                max-height: 200px;
                overflow-y: auto;
                display: none;
                z-index: 1000;
                width: calc(100% - 30px);
            }
            
            .estat-suggestion-item {
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid rgba(59, 130, 246, 0.1);
                transition: all 0.2s;
            }
            
            .estat-suggestion-item:hover {
                background: rgba(59, 130, 246, 0.2);
            }
            
            .estat-stat-title {
                color: #3b82f6;
                font-weight: 600;
                font-size: 13px;
            }
            
            .estat-stat-meta {
                font-size: 11px;
                color: #94a3b8;
                margin-top: 3px;
            }
            
            .estat-category-container {
                margin-bottom: 15px;
            }
            
            .estat-category-label {
                font-size: 12px;
                color: #94a3b8;
                margin-bottom: 5px;
            }
            
            .estat-category-select {
                width: 100%;
                padding: 8px;
                background: rgba(30, 41, 59, 0.5);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 6px;
                color: white;
                font-size: 13px;
            }
            
            .estat-selected-list {
                background: rgba(30, 41, 59, 0.3);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 15px;
            }
            
            .estat-selected-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                font-size: 13px;
            }
            
            .estat-count {
                background: #3b82f6;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
            }
            
            .estat-selected-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 4px;
                margin-bottom: 5px;
            }
            
            .estat-item-title {
                font-size: 12px;
                color: #e2e8f0;
            }
            
            .estat-item-category {
                font-size: 10px;
                color: #94a3b8;
            }
            
            .estat-remove-btn {
                background: none;
                border: none;
                color: #ef4444;
                cursor: pointer;
                padding: 4px;
            }
            
            .estat-action-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .estat-btn {
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
                transition: all 0.2s;
            }
            
            .estat-btn-primary {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
            }
            
            .estat-btn-secondary {
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
                border: 1px solid rgba(59, 130, 246, 0.3);
            }
            
            .estat-btn-export {
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            
            .estat-detail-panel {
                position: fixed;
                right: -400px;
                top: 60px;
                width: 400px;
                height: calc(100vh - 60px);
                background: rgba(15, 23, 42, 0.98);
                border-left: 1px solid rgba(59, 130, 246, 0.3);
                z-index: 1000;
                transition: right 0.3s ease;
                overflow-y: auto;
            }
            
            .estat-detail-panel.active {
                right: 0;
            }
            
            .estat-detail-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid rgba(59, 130, 246, 0.3);
            }
            
            .estat-close-btn {
                background: none;
                border: none;
                color: #ef4444;
                font-size: 20px;
                cursor: pointer;
            }
            
            .estat-detail-content {
                padding: 20px;
            }
            
            .estat-data-table {
                overflow-x: auto;
            }
            
            .estat-data-table table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }
            
            .estat-data-table th {
                background: rgba(59, 130, 246, 0.2);
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid rgba(59, 130, 246, 0.3);
            }
            
            .estat-data-table td {
                padding: 8px;
                border-bottom: 1px solid rgba(59, 130, 246, 0.1);
            }
            
            .estat-more-data {
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
                margin-top: 15px;
            }
            
            .estat-detail-loading {
                text-align: center;
                padding: 40px;
                color: #3b82f6;
            }
            
            .estat-error {
                text-align: center;
                padding: 20px;
                color: #ef4444;
            }
            
            /* エラーセルのスタイル */
            .error-cell {
                background-color: rgba(239, 68, 68, 0.1) !important;
                color: #ef4444 !important;
                text-align: center;
                font-style: italic;
                cursor: help;
            }
            
            .error-cell:hover {
                background-color: rgba(239, 68, 68, 0.2) !important;
            }
            
            /* ダッシュボードビューのエラー表示 */
            .error-item {
                opacity: 0.7;
            }
            
            .stat-error {
                color: #ef4444;
                font-style: italic;
                cursor: help;
            }
            
            /* グラフビューのエラー表示 */
            .chart-error {
                text-align: center;
                padding: 40px 20px;
                background-color: rgba(239, 68, 68, 0.05);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 8px;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            
            .chart-error p:first-child {
                font-weight: 500;
                margin-bottom: 8px;
            }
            
            /* 詳細検索スタイル */
            .estat-advanced-search {
                margin-top: 10px;
            }
            
            .estat-toggle-advanced {
                width: 100%;
                padding: 8px 12px;
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 6px;
                color: #3b82f6;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 13px;
                transition: all 0.2s;
            }
            
            .estat-toggle-advanced:hover {
                background: rgba(59, 130, 246, 0.2);
            }
            
            .estat-advanced-options {
                background: rgba(30, 41, 59, 0.5);
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 6px;
                padding: 15px;
                margin-top: 10px;
            }
            
            .estat-filter-group {
                margin-bottom: 12px;
            }
            
            .estat-filter-label {
                display: block;
                font-size: 12px;
                color: #94a3b8;
                margin-bottom: 5px;
            }
            
            .estat-year-selector {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .estat-year-select {
                flex: 1;
                padding: 6px 8px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 4px;
                color: white;
                font-size: 12px;
            }
            
            .estat-year-separator {
                color: #94a3b8;
                font-size: 12px;
            }
            
            .estat-region-select,
            .estat-prefecture-select,
            .estat-city-select,
            .estat-cycle-select {
                width: 100%;
                padding: 6px 8px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 4px;
                color: white;
                font-size: 12px;
                margin-bottom: 5px;
            }
            
            .estat-detail-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .estat-checkbox-label {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
                color: #e2e8f0;
                cursor: pointer;
            }
            
            .estat-checkbox-label input[type="checkbox"] {
                cursor: pointer;
            }
            
            .estat-filter-actions {
                display: flex;
                gap: 8px;
                margin-top: 15px;
            }
            
            .estat-btn-search {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                flex: 1;
            }
            
            .estat-btn-reset {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            
            .estat-btn-search:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
            }
            
            .estat-btn-reset:hover {
                background: rgba(239, 68, 68, 0.3);
            }
            
            /* サブカテゴリスタイル */
            .estat-sub-items {
                background: rgba(30, 41, 59, 0.5);
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 6px;
                padding: 12px;
            }
            
            .estat-sub-items-label {
                font-size: 12px;
                color: #94a3b8;
                margin-bottom: 8px;
            }
            
            .estat-sub-items-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 8px;
                margin-bottom: 10px;
            }
            
            .estat-sub-item-checkbox {
                margin-right: 4px;
            }
            
            #estat-subcategory-container {
                animation: slideDown 0.3s ease;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* 複数選択用スタイル */
            .estat-selection-mode {
                display: flex;
                gap: 15px;
                margin-bottom: 10px;
            }
            
            .estat-radio-label {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 13px;
                color: #e2e8f0;
                cursor: pointer;
            }
            
            .estat-selected-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 10px;
                min-height: 30px;
            }
            
            .estat-tag {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: rgba(59, 130, 246, 0.2);
                border: 1px solid rgba(59, 130, 246, 0.4);
                border-radius: 16px;
                padding: 4px 12px;
                font-size: 12px;
                color: #3b82f6;
            }
            
            .estat-tag-remove {
                background: none;
                border: none;
                color: #3b82f6;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                padding: 0;
                margin-left: 4px;
            }
            
            .estat-tag-remove:hover {
                color: #ef4444;
            }
            
            .estat-cities-container,
            .estat-subcategories-container {
                margin-top: 15px;
            }
            
            .estat-city-selector-group,
            .estat-subcategory-selector-group {
                background: rgba(30, 41, 59, 0.3);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 12px;
            }
            
            .estat-sub-label {
                display: block;
                font-size: 12px;
                color: #94a3b8;
                margin-bottom: 8px;
                font-weight: 600;
            }
            
            .estat-city-checkboxes,
            .estat-item-checkboxes {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 6px;
            }
            
            .estat-subcategory-section {
                margin-bottom: 12px;
            }
            
            .estat-subcategory-name {
                font-size: 12px;
                color: #3b82f6;
                font-weight: 600;
                margin-bottom: 6px;
            }
            
            /* クロス分析結果スタイル */
            .cross-analysis-summary {
                background: rgba(30, 41, 59, 0.5);
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 15px;
            }
            
            .cross-analysis-summary h4 {
                margin: 0 0 10px 0;
                color: #3b82f6;
            }
            
            .display-mode-selector {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 10px;
            }
            
            .estat-btn-small {
                padding: 6px 10px;
                font-size: 12px;
            }
            
            .estat-btn-small.active {
                background: #3b82f6;
                color: white;
            }
            
            .analysis-view-container {
                background: rgba(30, 41, 59, 0.3);
                border-radius: 6px;
                padding: 15px;
                overflow-x: auto;
            }
            
            /* マトリックス表示 */
            .cross-analysis-matrix {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            
            .cross-analysis-matrix th {
                background: rgba(59, 130, 246, 0.2);
                padding: 10px;
                text-align: left;
                border: 1px solid rgba(59, 130, 246, 0.3);
                white-space: nowrap;
            }
            
            .unit-header {
                background: rgba(59, 130, 246, 0.1);
                font-size: 12px;
                font-weight: normal;
                color: #94a3b8;
                text-align: center;
            }
            
            .cross-analysis-matrix td {
                padding: 10px;
                border: 1px solid rgba(59, 130, 246, 0.1);
                text-align: right;
            }
            
            .data-cell {
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .data-cell:hover {
                background: rgba(59, 130, 246, 0.1);
            }
            
            /* グラフ表示 - 2025-07-23更新 */
            .chart-view {
                display: flex;
                flex-direction: column;
                gap: 20px;
                height: 100%;
            }
            
            .chart-container {
                background: rgba(30, 41, 59, 0.5);
                border-radius: 6px;
                padding: 15px;
            }
            
            .chart-container h5 {
                margin: 0 0 10px 0;
                color: #3b82f6;
                font-size: 14px;
            }
            
            /* ダッシュボード表示 */
            .dashboard-view {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 15px;
            }
            
            .region-card {
                background: rgba(30, 41, 59, 0.5);
                border-radius: 6px;
                padding: 15px;
                border: 1px solid rgba(59, 130, 246, 0.2);
            }
            
            .region-card h5 {
                margin: 0 0 15px 0;
                color: #3b82f6;
                font-size: 16px;
            }
            
            .stat-item {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid rgba(59, 130, 246, 0.1);
            }
            
            .stat-label {
                color: #94a3b8;
                font-size: 12px;
            }
            
            .stat-value {
                color: #e2e8f0;
                font-weight: 600;
                font-size: 13px;
            }
            
            .stat-unit {
                color: #94a3b8;
                font-size: 11px;
                margin-left: 4px;
            }
            
            /* モーダル */
            .estat-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .estat-modal {
                background: rgba(15, 23, 42, 0.98);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .estat-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid rgba(59, 130, 246, 0.3);
            }
            
            .estat-modal-body {
                padding: 20px;
            }
            
            .time-series-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            
            .time-series-table th,
            .time-series-table td {
                padding: 8px;
                border: 1px solid rgba(59, 130, 246, 0.2);
                text-align: center;
            }
            
            /* ポップアップウィンドウ */
            .estat-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 1200px;
                height: 70%;
                max-height: 800px;
                background: rgba(15, 23, 42, 0.98);
                border: 1px solid rgba(59, 130, 246, 0.5);
                border-radius: 8px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                z-index: 2000;
                display: flex;
                flex-direction: column;
                transition: all 0.3s ease;
            }
            
            .estat-popup.minimized {
                height: auto;
                width: 300px;
            }
            
            .estat-popup.minimized .estat-popup-content {
                display: none;
            }
            
            .estat-popup.maximized {
                width: 95%;
                height: 95%;
                max-width: none;
                max-height: none;
            }
            
            .estat-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: rgba(30, 41, 59, 0.8);
                border-bottom: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px 8px 0 0;
                cursor: move;
            }
            
            .estat-popup-header h3 {
                margin: 0;
                color: #e2e8f0;
                font-size: 18px;
            }
            
            .popup-controls {
                display: flex;
                gap: 10px;
            }
            
            .popup-btn {
                background: rgba(59, 130, 246, 0.2);
                border: 1px solid rgba(59, 130, 246, 0.3);
                color: #e2e8f0;
                width: 30px;
                height: 30px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
            }
            
            .popup-btn:hover {
                background: rgba(59, 130, 246, 0.4);
                border-color: rgba(59, 130, 246, 0.5);
            }
            
            .close-btn:hover {
                background: rgba(239, 68, 68, 0.4);
                border-color: rgba(239, 68, 68, 0.5);
            }
            
            .estat-popup-content {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }
            
            /* マトリックスコントロール */
            .matrix-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 10px;
                background: rgba(30, 41, 59, 0.5);
                border-radius: 6px;
            }
            
            .year-selector {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .year-selector label {
                color: #94a3b8;
                font-size: 14px;
            }
            
            .year-selector select {
                padding: 6px 10px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 4px;
                color: white;
                font-size: 14px;
            }
            
            .view-options label {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #94a3b8;
                font-size: 14px;
                cursor: pointer;
            }
            
            .view-options input[type="checkbox"] {
                cursor: pointer;
            }
            
            /* セル内容のレイアウト */
            .cell-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            }
            
            .cell-value {
                font-weight: 600;
            }
            
            .cell-sparkline {
                margin-top: 5px;
            }
            
            /* グラフビューコントロール */
            .chart-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(30, 41, 59, 0.5);
                border-radius: 6px;
                gap: 20px;
            }
            
            .chart-type-selector,
            .chart-view-selector {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .chart-controls label {
                color: #94a3b8;
                font-size: 14px;
                white-space: nowrap;
            }
            
            .chart-controls select {
                padding: 8px 12px;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 4px;
                color: white;
                font-size: 14px;
                min-width: 150px;
            }
            
            /* グラフグリッド */
            .charts-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 20px;
                min-height: 400px;
                flex: 1;
                overflow-y: auto;
            }
            
            .chart-wrapper {
                background: rgba(30, 41, 59, 0.5);
                border-radius: 6px;
                padding: 20px;
                border: 1px solid rgba(59, 130, 246, 0.2);
                min-height: 350px;
            }
            
            .chart-wrapper.large {
                grid-column: 1 / -1;
            }
            
            .chart-wrapper h5 {
                margin: 0 0 15px 0;
                color: #3b82f6;
                font-size: 16px;
            }
            
            .chart-wrapper canvas {
                max-height: 300px;
            }
            
            .chart-wrapper.large canvas {
                max-height: 400px;
            }
            
            .time-series-table th {
                background: rgba(59, 130, 246, 0.1);
            }
            
            /* カスタムチャート設定UI用スタイル - 2025-07-23更新 */
            .custom-chart-config {
                display: none;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 4px;
                padding: 15px;
                margin: 15px 0;
            }
            
            .custom-chart-config.active {
                display: block;
            }
            
            .custom-chart-layout {
                display: flex;
                flex-direction: column;
                gap: 20px;
                height: 100%;
            }
            
            .axis-config-panels {
                width: 100%;
                flex-shrink: 0;
            }
            
            .axis-selectors {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            
            .axis-selector {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .axis-selector label {
                color: #888;
                font-size: 12px;
                font-weight: 500;
            }
            
            .axis-selector select {
                background: #1a1a1a;
                color: #ddd;
                border: 1px solid #444;
                border-radius: 4px;
                padding: 8px;
                font-size: 14px;
                cursor: pointer;
            }
            
            .axis-selector select:hover {
                border-color: #666;
            }
            
            .axis-selector select:focus {
                outline: none;
                border-color: #0ea5e9;
            }
            
            .filter-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                padding-top: 15px;
                border-top: 1px solid #444;
            }
            
            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .filter-group label {
                color: #888;
                font-size: 12px;
                font-weight: 500;
            }
            
            .filter-group select[multiple] {
                background: #1a1a1a;
                color: #ddd;
                border: 1px solid #444;
                border-radius: 4px;
                padding: 4px;
                min-height: 100px;
                font-size: 13px;
            }
            
            .filter-group select[multiple] option {
                padding: 2px 4px;
            }
            
            .filter-group select[multiple] option:hover {
                background: #333;
            }
            
            .filter-group select[multiple] option:checked {
                background: #0ea5e9;
                color: white;
            }
            
            /* カスタムチャートコンテナ - 2025-07-23追加 */
            #custom-chart-container {
                width: 100%;
                height: 500px;
                position: relative;
                background: rgba(30, 41, 59, 0.5);
                border-radius: 6px;
                padding: 20px;
                border: 1px solid rgba(59, 130, 246, 0.2);
                margin-top: 20px;
            }
            
            #customChart {
                width: 100% !important;
                height: 100% !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * カスタムチャート設定UIの表示/非表示を管理
     */
    manageCustomChartConfig(viewType) {
        // カスタムチャート設定UIを取得または作成
        let configDiv = document.querySelector('.custom-chart-config');
        
        if (viewType === 'custom') {
            // カスタムチャート設定UIを表示
            if (!configDiv) {
                this.createCustomChartConfig();
                configDiv = document.querySelector('.custom-chart-config');
            }
            
            if (configDiv) {
                configDiv.classList.add('active');
                
                // フィルターオプションを更新
                this.updateCustomChartFilters();
            }
        } else {
            // カスタムチャート設定UIを非表示
            if (configDiv) {
                configDiv.classList.remove('active');
            }
        }
    }
    
    /**
     * カスタムチャート設定UIを作成
     */
    createCustomChartConfig() {
        const chartControls = document.querySelector('.chart-controls');
        if (!chartControls) {
            return;
        }
        
        const configDiv = document.createElement('div');
        configDiv.className = 'custom-chart-config';
        
        configDiv.innerHTML = `
            <div class="custom-chart-layout">
                <div class="axis-config-panels">
                    <div class="axis-selectors">
                        <div class="axis-selector">
                            <label>X軸（横軸）:</label>
                            <select id="customXAxis" onchange="estatIntegration.updateCustomChart()">
                                <option value="year">年度</option>
                                <option value="region">地域</option>
                                <option value="indicator">指標</option>
                            </select>
                        </div>
                        <div class="axis-selector">
                            <label>Y軸（縦軸）:</label>
                            <select id="customYAxis">
                                <option value="value">値</option>
                            </select>
                        </div>
                        <div class="axis-selector">
                            <label>グループ化:</label>
                            <select id="customGroupBy" onchange="estatIntegration.updateCustomChart()">
                                <option value="">なし</option>
                                <option value="year">年度別</option>
                                <option value="region">地域別</option>
                                <option value="indicator">指標別</option>
                            </select>
                        </div>
                    </div>
                </div>
                </div>
                
                <div class="filter-section">
                    <div class="filter-group">
                    <label>表示する地域:</label>
                    <select id="customRegionFilter" multiple size="5" onchange="estatIntegration.updateCustomChart()"></select>
                </div>
                <div class="filter-group">
                    <label>表示する指標:</label>
                    <select id="customIndicatorFilter" multiple size="5" onchange="estatIntegration.updateCustomChart()"></select>
                </div>
                <div class="filter-group">
                    <label>表示する年度:</label>
                    <select id="customYearFilter" multiple size="5" onchange="estatIntegration.updateCustomChart()"></select>
                </div>
                </div>
            </div>
        `;
        
        // chart-controlsの後に挿入
        chartControls.parentNode.insertBefore(configDiv, chartControls.nextSibling);
    }
    
    /**
     * カスタムチャートフィルターを更新
     */
    updateCustomChartFilters() {
        const data = this.currentCrossData;
        if (!data) return;
        
        // 地域フィルター
        const regionFilter = document.getElementById('customRegionFilter');
        if (regionFilter) {
            regionFilter.innerHTML = Object.keys(data.regions).map(region =>
                `<option value="${escapeHtml(region)}" selected>${escapeHtml(region)}</option>`
            ).join('');
        }
        
        // 指標フィルター
        const indicatorFilter = document.getElementById('customIndicatorFilter');
        if (indicatorFilter) {
            indicatorFilter.innerHTML = Object.entries(data.indicators).map(([key, info]) =>
                `<option value="${escapeHtml(key)}" selected>${escapeHtml(info.item)}</option>`
            ).join('');
        }
        
        // 年度フィルター
        const yearFilter = document.getElementById('customYearFilter');
        if (yearFilter) {
            const years = this.getAvailableYears(data);
            yearFilter.innerHTML = years.map(year =>
                `<option value="${escapeHtml(year)}" selected>${escapeHtml(year)}年</option>`
            ).join('');
        }
    }
}

// グローバルインスタンス
window.estatIntegration = new EStatIntegration();

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.estatIntegration.enhanceStatisticsSection();
    }, 1000);
});