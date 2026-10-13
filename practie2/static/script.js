const mapContainer = document.querySelector(".map-container");
const map = document.getElementById("map");

const photo =
    document.getElementById("building-photo");

const prevBtn =
    document.getElementById("prev-photo");

const nextBtn =
    document.getElementById("next-photo");

let currentPhotos = [];
let currentIndex = 0;

const saveBtn = document.getElementById("saveBtn");
const loadFile = document.getElementById("loadFile");

const popupOverlay =
    document.getElementById("popup-overlay");

const closePopup =
    document.getElementById("close-popup");

let buildings = [];

const EDIT_MODE = false;

//////////////////////////////////////////////////
// 建物作成
//////////////////////////////////////////////////

function createBuilding(name, x, y) {

    const button = document.createElement("button");

    button.className = "building";
    button.textContent = name;

    // 検索選択時のピン色変更に使用
    button.dataset.buildingName = name;

    button.style.left = x + "px";
    button.style.top = y + "px";

    mapContainer.appendChild(button);

    const building = {
        shortName: name,
        x: x,
        y: y,
        element: button                    
    };

    buildings.push(building);

    //////////////////////////////////////////////////
    // ボタンクリックで情報表示
    //////////////////////////////////////////////////

    button.addEventListener("click", function (e) {

    e.stopPropagation();

    // クリックまたは検索されたピンだけ色を変更
    popupOverlay.classList.remove("facility-open");
    highlightBuilding(building.shortName);

    const info = BUILDING_INFO[building.shortName];


    /* ==========================
       バス判定
    ========================== */

    const isBus =

        building.shortName === "バス"

        ||

        (
            info &&
            info.fullName &&
            info.fullName.includes("バス")
        );


    if (isBus) {

        startBusInformation();

    } else {

        stopBusInformation();

    }


    /* ここから元々の処理 */

    if (!info) {

        document.getElementById("building-name")
            .textContent = building.shortName;

        document.getElementById("building-description")
            .textContent = "情報未登録";

        document.getElementById("building-photo")
            .src = "";

        popupOverlay.style.display = "flex";

        return;
    }

        document.getElementById("building-name")
            .textContent = info.fullName;

        document.getElementById("building-description")
            .textContent = info.description;

        if (info.photos) {

            currentPhotos = info.photos;

        } else {

            currentPhotos = [info.photo];

        }

        currentIndex = 0;

        photo.src =
            "/static/" + currentPhotos[currentIndex];

        popupOverlay.style.display = "flex";
    });

    //////////////////////////////////////////////////
    // 編集モード時のみ
    //////////////////////////////////////////////////

    if (EDIT_MODE) {

        makeDraggable(building);

        button.addEventListener("contextmenu", function (e) {

            e.preventDefault();

            if (confirm(name + " を削除しますか？")) {

                button.remove();

                buildings = buildings.filter(
                    b => b !== building
                );
            }
        });
    }
}

//////////////////////////////////////////////////
// ドラッグ移動
//////////////////////////////////////////////////

function makeDraggable(building) {

    let dragging = false;

    const btn = building.element;

    btn.addEventListener("mousedown", function () {

        dragging = true;
    });

    document.addEventListener("mouseup", function () {

        dragging = false;
    });

    document.addEventListener("mousemove", function (e) {

        if (!dragging) return;

        const rect =
            mapContainer.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        btn.style.left = x + "px";
        btn.style.top = y + "px";

        building.x = Math.round(x);
        building.y = Math.round(y);
    });
}

//////////////////////////////////////////////////
// 建物追加（編集モードのみ）
//////////////////////////////////////////////////

if (EDIT_MODE) {

    map.addEventListener("click", function (e) {

        const name = prompt("建物名を入力");

        if (!name) return;

        createBuilding(
            name,
            e.offsetX,
            e.offsetY
        );
    });
}

//////////////////////////////////////////////////
// CSVの読み込み（引用符付きのカンマ・改行にも対応）
//////////////////////////////////////////////////

let campusRecords = [];
let facilityMarkers = [];
const SOURCE_MAP_NOTICE =
    "ピンは建物の代表位置です。詳しい設置場所・階数・利用可否は現地の案内を確認してください。";

function parseCampusCsv(text) {
    const records = [];
    let row = [], cell = "", inQuotes = false;
    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') { cell += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (char === "," && !inQuotes) {
            row.push(cell); cell = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && text[i + 1] === "\n") i++;
            row.push(cell); cell = "";
            if (row.some(value => value.trim())) records.push(row);
            row = [];
        } else { cell += char; }
    }
    row.push(cell);
    if (row.some(value => value.trim())) records.push(row);
    const [headers, ...data] = records;
    if (!headers) return [];
    return data.map(values => Object.fromEntries(
        headers.map((header, index) => [header.trim(), values[index] || ""])
    ));
}

function normalizeSearch(value) {
    return String(value || "").normalize("NFKC").toLowerCase()
        .replace(/[\s　・･_\-]+/g, "")
        .replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

function recordAliases(record) {
    return [record["建物ID"], record["正式名称"], record["略称"],
        ...(record["検索ワード"] || "").split(/[、,，]/)]
        .filter(Boolean);
}

function recordType(record) {
    // 旧CSVの「トイレ」はバリアフリートイレとして扱う
    const type = record["種別"] || "建物";
    return type === "トイレ" ? "バリアフリートイレ" : type;
}

function isPublicFacility(record) {
    const type = recordType(record);
    if (type === "建物" || !record["対象建物ID"]) return false;
    if (type === "一般トイレ") {
        return ["確認済み", "公式マップ確認済み", "現地確認済み"].includes(record["確認状況"]);
    }
    return record["確認状況"] !== "未確認";
}

function facilityName(type) {
    return type === "AED" ? "AED" :
        type === "一般トイレ" ? "一般トイレ" :
        type === "バリアフリートイレ" ? "バリアフリートイレ" : "トイレ";
}

function showSearchStatus(message) {
    const el = document.getElementById("search-status");
    if (el) {
        el.textContent = message;
        el.hidden = !message;
    }
}

function setFacilityVisible(type, visible) {
    const menus = {
        "AED": menuAED,
        "バリアフリートイレ": menuToilet,
        "一般トイレ": menuGeneralToilet
    };
    const menu = menus[type];
    if (!menu) return;
    menu.dataset.enabled = String(visible);
    menu.setAttribute("aria-pressed", String(visible));
    const state = menu.querySelector(".menu-toggle-state");
    if (state) state.textContent = visible ? "ON" : "OFF";
    facilityMarkers.filter(item => item.type === type).forEach(item => {
        item.element.hidden = !visible;
    });
    if (visible && !facilityMarkers.some(item => item.type === type)) {
        showSearchStatus(`${facilityName(type)}の場所はまだ確認できていません。設置場所・階数を確認したらCSVの「確認状況」を「確認済み」にすると表示できます。`);
    } else {
        showSearchStatus(visible ? `${facilityName(type)}を表示しています。${SOURCE_MAP_NOTICE}` : "");
    }
}

function openFacilityInfo(record) {
    stopBusInformation();
    const code = record["対象建物ID"];
    const host = buildings.find(b => b.shortName === code);
    if (host) highlightBuilding(code);
    popupOverlay.classList.add("facility-open");
    document.getElementById("building-name").textContent =
        record["正式名称"];
    const floor = record["設置階"] ? `設置階：${record["設置階"]}。\n` :
        "設置階：公式地図に詳細記載なし。\n";
    document.getElementById("building-description").textContent =
        floor + (record["補足"] || SOURCE_MAP_NOTICE);
    popupOverlay.style.display = "flex";
}

function createFacilityMarkers() {
    facilityMarkers.forEach(item => item.element.remove());
    facilityMarkers = [];
    campusRecords.filter(isPublicFacility).forEach(record => {
        const host = buildings.find(b => b.shortName === record["対象建物ID"]);
        if (!host) return;
        const type = recordType(record);
        if (!["AED", "一般トイレ", "バリアフリートイレ"].includes(type)) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "facility-marker " +
            (type === "AED" ? "facility-marker--aed" :
             type === "一般トイレ" ? "facility-marker--general" :
             "facility-marker--accessible");
        button.textContent = type === "AED" ? "AED" :
            type === "一般トイレ" ? "🚻" : "♿";
        button.title = record["正式名称"] +
            (record["設置階"] ? " / " + record["設置階"] : "");
        button.setAttribute("aria-label", button.title);
        const offsets = {
            "AED": [32, -32],
            "一般トイレ": [-32, 29],
            "バリアフリートイレ": [-32, -32]
        };
        const [dx, dy] = offsets[type];
        button.style.left = (host.x + dx) + "px";
        button.style.top = (host.y + dy) + "px";
        button.hidden = true;
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            openFacilityInfo(record);
        });
        mapContainer.appendChild(button);
        facilityMarkers.push({ record, type, element: button });
    });
}

//////////////////////////////////////////////////
// 起動時自動読込：建物座標とCSVは別々に管理
//////////////////////////////////////////////////

Promise.all([
    fetch("/static/buildings.json").then(response => {
        if (!response.ok) throw new Error("建物ピンを読み込めません");
        return response.json();
    }),
    fetch("/static/campus_info.csv").then(response => {
        if (!response.ok) throw new Error("キャンパスCSVを読み込めません");
        return response.text();
    }).then(parseCampusCsv).catch(error => {
        console.warn("CSVが読み込めません。建物コード検索のみ有効です", error);
        return [];
    })
]).then(([pins, records]) => {
    pins.forEach(item => createBuilding(item.name, item.x, item.y));
    campusRecords = records;
    createFacilityMarkers();
    updateSearchList();
    resizeCampusMap();
}).catch(error => {
    console.error("キャンパスマップの読み込みに失敗", error);
    showSearchStatus("地図データを読み込めませんでした。再読み込みしてください。");
});

//////////////////////////////////////////////////
// ポップアップを閉じる
//////////////////////////////////////////////////

closePopup.addEventListener("click", function () {
    popupOverlay.style.display = "none";
    popupOverlay.classList.remove("facility-open");
    stopBusInformation();
});

popupOverlay.addEventListener("click", function (e) {
    if (e.target === popupOverlay) {
        popupOverlay.style.display = "none";
        popupOverlay.classList.remove("facility-open");
        stopBusInformation();
    }
});

//////////////////////////////////////////////////
// CSVの正式名称、略称、検索ワードを候補に反映
//////////////////////////////////////////////////

function updateSearchList() {
    const datalist = document.getElementById("buildingList");
    datalist.innerHTML = "";
    const alreadyAdded = new Set();
    campusRecords.forEach(record => {
        if (recordType(record) !== "建物") return;
        recordAliases(record).forEach(alias => {
            const key = normalizeSearch(alias);
            if (!key || alreadyAdded.has(key)) return;
            alreadyAdded.add(key);
            const option = document.createElement("option");
            option.value = alias.trim();
            option.label = `${record["正式名称"]}（${record["建物ID"]}）`;
            datalist.appendChild(option);
        });
    });
    // 特定施設の検索にも対応（例: AED 清和館、トイレ H）
    campusRecords.filter(isPublicFacility).forEach(record => {
        const option = document.createElement("option");
        option.value = `${facilityName(recordType(record))} ${record["対象建物ID"]}`;
        option.label = record["正式名称"];
        datalist.appendChild(option);
    });
    ["AED", "トイレ", "一般トイレ", "バリアフリートイレ"].forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.label = value === "トイレ" ? "トイレの場所を表示" : `${value}の場所を表示`;
        datalist.appendChild(option);
    });
}

function findSearchMatches(value) {
    const keyword = normalizeSearch(value);
    if (!keyword) return [];
    const searchableRecords = campusRecords.filter(record =>
        recordType(record) === "建物" || isPublicFacility(record));
    const exact = searchableRecords.filter(record =>
        recordAliases(record).some(alias => normalizeSearch(alias) === keyword)
    );
    if (exact.length) return exact;
    // 入力途中は前方一致を優先。部分一致は複数候補がある場合は確定しない
    const prefix = searchableRecords.filter(record =>
        recordAliases(record).some(alias => normalizeSearch(alias).startsWith(keyword))
    );
    if (prefix.length) return prefix;
    return searchableRecords.filter(record =>
        recordAliases(record).some(alias => normalizeSearch(alias).includes(keyword))
    );
}

function lookupSearch(value) {
    const keyword = normalizeSearch(value);
    if (!keyword) return {type: "none"};
    if (["aed", "エーイーディー", "除細動器"].includes(keyword)) {
        return {type: "category", category: "AED"};
    }
    if (["トイレ", "お手洗い", "御手洗", "便所"].includes(keyword)) {
        return {type: "category", category: "トイレ"};
    }
    if (["一般トイレ", "一般", "🚻"].includes(keyword)) {
        return {type: "category", category: "一般トイレ"};
    }
    if (["バリアフリートイレ", "多目的トイレ", "車いすトイレ", "♿"].includes(keyword)) {
        return {type: "category", category: "バリアフリートイレ"};
    }
    // 元の「1 (清和館)」形式の入力も使える
    const legacyCode = value.trim().match(/^([A-Za-z0-9]+)\s*[(（]/);
    if (legacyCode && buildings.some(b => b.shortName === legacyCode[1])) {
        return {type: "building", code: legacyCode[1]};
    }
    const matches = findSearchMatches(value);
    if (matches.length !== 1) return {type: matches.length ? "multiple" : "none"};
    const record = matches[0];
    return recordType(record) === "建物" ?
        {type: "building", code: record["建物ID"]} :
        {type: "facility", record};
}

//////////////////////////////////////////////////
// 検索バー
//////////////////////////////////////////////////

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", function () {
    const found = lookupSearch(this.value);
    showSearchStatus("");
    if (found.type === "building") highlightBuilding(found.code);
    else if (found.type === "facility") highlightBuilding(found.record["対象建物ID"]);
    else clearBuildingHighlight();
});

searchInput.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const found = lookupSearch(this.value);
    if (found.type === "category") {
        if (found.category === "トイレ") {
            setFacilityVisible("一般トイレ", true);
            setFacilityVisible("バリアフリートイレ", true);
        } else {
            setFacilityVisible(found.category, true);
        }
        return;
    }
    if (found.type === "facility") {
        setFacilityVisible(recordType(found.record), true);
        openFacilityInfo(found.record);
        return;
    }
    if (found.type === "building") {
        const building = buildings.find(b => b.shortName === found.code);
        if (building) { building.element.click(); return; }
    }
    showSearchStatus(found.type === "multiple" ?
        "候補が複数あります。もう少し入力するか候補から選択してください。" :
        "見つかりません。正式名称・略称・建物番号で検索してください。");
});

//////////////////////////////////////////////////
// 写真スライダー
// PC・スマホ・タブレット共通
//////////////////////////////////////////////////

function showCurrentPhoto() {

    if (
        !currentPhotos ||
        currentPhotos.length === 0
    ) {
        return;
    }

    const newSrc =
        "/static/" +
        currentPhotos[currentIndex];

    if (
        photo.getAttribute("src") === newSrc
    ) {
        return;
    }

    const img = new Image();

    img.decoding = "async";

    img.src = newSrc;

    img.onload = function () {

        photo.src = newSrc;

        preloadNextPhoto();
    };
}


function preloadNextPhoto() {

    if (
        !currentPhotos ||
        currentPhotos.length <= 1
    ) {
        return;
    }

    const nextIndex =
        (currentIndex + 1) %
        currentPhotos.length;

    const img =
        new Image();

    img.decoding = "async";

    img.src =
        "/static/" +
        currentPhotos[nextIndex];
}


/* ==========================
   前の写真
========================== */

function showPreviousPhoto() {

    if (
        !currentPhotos ||
        currentPhotos.length <= 1
    ) {
        return;
    }

    currentIndex--;

    if (currentIndex < 0) {

        currentIndex =
            currentPhotos.length - 1;
    }

    showCurrentPhoto();
}


/* ==========================
   次の写真
========================== */

function showNextPhoto() {

    if (
        !currentPhotos ||
        currentPhotos.length <= 1
    ) {
        return;
    }

    currentIndex++;

    if (
        currentIndex >=
        currentPhotos.length
    ) {

        currentIndex = 0;
    }

    showCurrentPhoto();
}


/* ==========================
   ◀ ボタン
========================== */

prevBtn.addEventListener(
    "click",
    function (e) {

        e.stopPropagation();

        showPreviousPhoto();
    }
);


/* ==========================
   ▶ ボタン
========================== */

nextBtn.addEventListener(
    "click",
    function (e) {

        e.stopPropagation();

        showNextPhoto();
    }
);


/* ==========================
   スワイプ・ドラッグ
   スマホ / タブレット / PC共通
========================== */

let slideStartX = 0;

let slideCurrentX = 0;

let isSliding = false;


/* 押した瞬間 */

photo.addEventListener(
    "pointerdown",
    function (e) {

        if (
            currentPhotos.length <= 1
        ) {
            return;
        }

        isSliding = true;

        slideStartX =
            e.clientX;

        slideCurrentX =
            e.clientX;

        photo.setPointerCapture(
            e.pointerId
        );

        photo.classList.add(
            "dragging"
        );
    }
);


/* 動かしている途中 */

photo.addEventListener(
    "pointermove",
    function (e) {

        if (!isSliding) {
            return;
        }

        slideCurrentX =
            e.clientX;

        const moveX =
            slideCurrentX -
            slideStartX;

        /*
        指・マウスについてくるように
        少しだけ画像を動かす
        */

        photo.style.transform =
            `translateX(${moveX}px)`;

        photo.style.transition =
            "none";
    }
);


/* 指・マウスを離した */

photo.addEventListener(
    "pointerup",
    function (e) {

        if (!isSliding) {
            return;
        }

        isSliding = false;

        const moveX =
            slideCurrentX -
            slideStartX;


        /*
        50px以上動かしたら
        写真を切り替える
        */

        if (moveX < -50) {

            // 左へスワイプ
            showNextPhoto();

        }

        else if (moveX > 50) {

            // 右へスワイプ
            showPreviousPhoto();

        }


        /*
        写真の位置を元に戻す
        */

        photo.style.transition =
            "transform .2s ease";

        photo.style.transform =
            "translateX(0)";


        photo.classList.remove(
            "dragging"
        );
    }
);


/* ==========================
   操作途中でキャンセルされた場合
========================== */

photo.addEventListener(
    "pointercancel",
    function () {

        isSliding = false;

        photo.style.transition =
            "transform .2s ease";

        photo.style.transform =
            "translateX(0)";

        photo.classList.remove(
            "dragging"
        );
    }
);


/* ==========================
   PCキーボード
========================== */

document.addEventListener(
    "keydown",
    function (e) {

        /*
        ポップアップが閉じていたら
        写真を変更しない
        */

        if (
            popupOverlay.style.display
            !== "flex"
        ) {
            return;
        }


        if (
            e.key === "ArrowLeft"
        ) {

            showPreviousPhoto();
        }


        if (
            e.key === "ArrowRight"
        ) {

            showNextPhoto();
        }

    }
);

//////////////////////////////////////////////////
// 地図サイズ調整
//////////////////////////////////////////////////

function resizeCampusMap() {

    const baseWidth = 1080;

    const mapArea =
        document.querySelector(".map-area");

    const mapContainer =
        document.querySelector(".map-container");

    if (!mapArea || !mapContainer) {

        return;
    }

    const availableWidth =
        mapArea.clientWidth;

    const scale =
        Math.min(availableWidth / baseWidth, 1);

    mapContainer.style.transform =
        `scale(${scale})`;

    // transformで縮小しても元の高さが残るため、高さを調整
    mapArea.style.height =
        `${mapContainer.offsetHeight * scale}px`;
}

window.addEventListener(
    "load",
    resizeCampusMap
);

window.addEventListener(
    "resize",
    resizeCampusMap
);

//////////////////////////////////////////////////
// 選択された建物のピンを強調
//////////////////////////////////////////////////

function highlightBuilding(buildingName) {

    const pins =
        document.querySelectorAll(".building");

    pins.forEach((pin) => {

        const isSelected =
            pin.dataset.buildingName === buildingName;

        pin.classList.toggle(
            "selected",
            isSelected
        );
    });
}

//////////////////////////////////////////////////
// ピンの強調を解除
//////////////////////////////////////////////////

function clearBuildingHighlight() {

    document
        .querySelectorAll(".building")
        .forEach((pin) => {

            pin.classList.remove("selected");

        });
}





//////////////////////////////////////////////////
// GPS 現在地機能【全ユーザー共通・自動版】
//////////////////////////////////////////////////

let gpsWatchId = null;


/* =========================================
   GPS基準点
   青・緑・黄色（バス）の3地点
========================================= */

const GPS_POINTS = [

    {
        // 青丸
        lat: 34.96832259108985,
        lng: 135.82729111471667,
        x: 265,
        y: 184
    },

    {
        // 緑丸
        lat: 34.968850,
        lng: 135.826204,
        x: 267,
        y: 380
    },

    {
        // 黄色丸：バス
        lat: 34.968483,
        lng: 135.823929,
        x: 715,
        y: 620
    }

];


/* =========================================
   現在地マーカー
========================================= */

const userLocationMarker =
    document.createElement("div");

userLocationMarker.id = "user-location";

userLocationMarker.style.display = "none";

mapContainer.appendChild(
    userLocationMarker
);

// 端末が返す水平精度（m）の範囲を地図上に描く。
// 画像が回転・変形していても正しく重なるよう、測位円を地図座標に変換する。
const gpsAccuracySvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
gpsAccuracySvg.id = "user-accuracy-region";
gpsAccuracySvg.setAttribute("aria-hidden", "true");
gpsAccuracySvg.style.display = "none";
const gpsAccuracyPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
gpsAccuracySvg.appendChild(gpsAccuracyPath);
mapContainer.insertBefore(gpsAccuracySvg, userLocationMarker);


/* =========================================
   GPSボタン
========================================= */

const gpsButton =
    document.createElement("button");

gpsButton.type = "button";

gpsButton.className = "gps-btn";

gpsButton.textContent = "◎";

gpsButton.title = "現在地";

document.body.appendChild(
    gpsButton
);


/* =========================================
   GPSメッセージ
========================================= */

const gpsStatus =
    document.createElement("div");

gpsStatus.className = "gps-status";

gpsStatus.style.display = "none";

document.body.appendChild(
    gpsStatus
);


function showGpsStatus(message) {

    gpsStatus.textContent = message;

    gpsStatus.style.display = "block";

    clearTimeout(
        showGpsStatus.timer
    );

    showGpsStatus.timer =
        setTimeout(function () {

            gpsStatus.style.display = "none";

        }, 4000);
}


/* =========================================
   3元連立方程式
========================================= */

function solve3x3(matrix, values) {

    const a =
        matrix.map(
            function (row, index) {

                return [
                    ...row,
                    values[index]
                ];

            }
        );


    for (
        let col = 0;
        col < 3;
        col++
    ) {

        let pivot = col;


        for (
            let row = col + 1;
            row < 3;
            row++
        ) {

            if (
                Math.abs(a[row][col])
                >
                Math.abs(a[pivot][col])
            ) {

                pivot = row;
            }
        }


        if (
            Math.abs(
                a[pivot][col]
            ) < 0.000000000001
        ) {

            throw new Error(
                "GPS座標変換エラー"
            );
        }


        [
            a[col],
            a[pivot]

        ] = [

            a[pivot],
            a[col]

        ];


        const divisor =
            a[col][col];


        for (
            let j = col;
            j < 4;
            j++
        ) {

            a[col][j] /= divisor;
        }


        for (
            let row = 0;
            row < 3;
            row++
        ) {

            if (row === col) {
                continue;
            }


            const factor =
                a[row][col];


            for (
                let j = col;
                j < 4;
                j++
            ) {

                a[row][j] -=
                    factor *
                    a[col][j];
            }
        }
    }


    return [

        a[0][3],
        a[1][3],
        a[2][3]

    ];
}


/* =========================================
   GPS緯度経度 → キャンパスマップX・Y
========================================= */

function gpsToMap(lat, lng) {

    const matrix =
        GPS_POINTS.map(
            function (point) {

                return [

                    point.lng,
                    point.lat,
                    1

                ];
            }
        );


    const xValues =
        GPS_POINTS.map(
            point => point.x
        );


    const yValues =
        GPS_POINTS.map(
            point => point.y
        );


    try {

        const xCoefficient =
            solve3x3(
                matrix,
                xValues
            );


        const yCoefficient =
            solve3x3(
                matrix,
                yValues
            );


        const x =

            xCoefficient[0] * lng +

            xCoefficient[1] * lat +

            xCoefficient[2];


        const y =

            yCoefficient[0] * lng +

            yCoefficient[1] * lat +

            yCoefficient[2];


        return {

            x: x,
            y: y

        };


    } catch (error) {

        console.error(
            "GPS変換エラー",
            error
        );


        return null;
    }
}


/* =========================================
   メインキャンパス範囲

   サッカーコート側は除外
========================================= */

const MAIN_CAMPUS_AREA = [

    { x: 25,  y: 330 },

    { x: 90,  y: 150 },

    { x: 220, y: 80 },

    { x: 400, y: 65 },

    { x: 620, y: 145 },

    { x: 675, y: 300 },

    { x: 850, y: 345 },

    { x: 915, y: 520 },

    { x: 790, y: 750 },

    { x: 450, y: 595 },

    { x: 215, y: 515 }

];


/* =========================================
   座標がキャンパス内か判定
========================================= */

function isInsideMainCampus(x, y) {

    let inside = false;


    for (
        let i = 0,
            j = MAIN_CAMPUS_AREA.length - 1;

        i < MAIN_CAMPUS_AREA.length;

        j = i++
    ) {

        const xi =
            MAIN_CAMPUS_AREA[i].x;

        const yi =
            MAIN_CAMPUS_AREA[i].y;


        const xj =
            MAIN_CAMPUS_AREA[j].x;

        const yj =
            MAIN_CAMPUS_AREA[j].y;


        const intersect =

            (
                (yi > y) !==
                (yj > y)
            )

            &&

            (
                x <
                (
                    (xj - xi) *
                    (y - yi)
                    /
                    (yj - yi)
                    +
                    xi
                )
            );


        if (intersect) {

            inside = !inside;
        }
    }


    return inside;
}


/* =========================================
   iPhone / Android 共通の現在地改善
   - HTML Geolocation: 端末のGPS / Wi-Fi / 携帯基地局をOS側で組合せ
   - 古い座標・明らかな飛び値を排除
   - 測位精度に応じた軽い平滑化（画面表示のみ）
   - 測位誤差の範囲表示、手動の地図位置補正
   ※ ネイティブのWi-Fi電波・Wi-Fi RTTの直接読取は行わない
========================================= */

let gpsLastFix = null;
let gpsOutlier = null;
let gpsCalibrationOffset = { x: 0, y: 0 };
let gpsCalibrationMode = false;
let gpsHasShownFirstFix = false;
let gpsLastQuality = "";

const gpsQuality = document.createElement("div");
gpsQuality.className = "gps-quality";
gpsQuality.setAttribute("role", "status");
gpsQuality.setAttribute("aria-live", "polite");
gpsQuality.hidden = true;
document.body.appendChild(gpsQuality);

const gpsCalibrationButton = document.createElement("button");
gpsCalibrationButton.type = "button";
gpsCalibrationButton.className = "gps-calibrate-btn";
gpsCalibrationButton.textContent = "📍 位置補正";
gpsCalibrationButton.title = "今いる場所を地図でタップして位置を補正";
gpsCalibrationButton.hidden = true;
document.body.appendChild(gpsCalibrationButton);

const gpsCalibrationPanel = document.createElement("div");
gpsCalibrationPanel.className = "gps-calibration-panel";
gpsCalibrationPanel.hidden = true;
gpsCalibrationPanel.setAttribute("role", "group");
gpsCalibrationPanel.setAttribute("aria-label", "現在地の地図表示を補正");

const gpsCalibrationText = document.createElement("span");
gpsCalibrationText.textContent = "実際に立っている場所を地図上でタップしてください";
gpsCalibrationPanel.appendChild(gpsCalibrationText);

const gpsCalibrationReset = document.createElement("button");
gpsCalibrationReset.type = "button";
gpsCalibrationReset.textContent = "補正解除";
gpsCalibrationPanel.appendChild(gpsCalibrationReset);

const gpsCalibrationCancel = document.createElement("button");
gpsCalibrationCancel.type = "button";
gpsCalibrationCancel.textContent = "キャンセル";
gpsCalibrationPanel.appendChild(gpsCalibrationCancel);
document.body.appendChild(gpsCalibrationPanel);

function gpsDistanceMeters(a, b) {
    const radians = Math.PI / 180;
    const dLat = (a.lat - b.lat) * radians;
    const dLng = (a.lng - b.lng) * radians;
    const midLat = (a.lat + b.lat) / 2 * radians;
    return Math.hypot(
        dLat * 6371000,
        dLng * Math.cos(midLat) * 6371000
    );
}

// 円周上の緯度経度を36点で地図へ投影する（単純な円より地図の歪みに対応）。
function drawGpsAccuracy(fix) {
    const height = map.offsetHeight || 800;
    gpsAccuracySvg.setAttribute("viewBox", `0 0 1080 ${height}`);
    const points = [];
    const latRad = fix.lat * Math.PI / 180;
    for (let i = 0; i < 36; i++) {
        const angle = Math.PI * 2 * i / 36;
        const eastMeters = Math.cos(angle) * fix.accuracy;
        const northMeters = Math.sin(angle) * fix.accuracy;
        const projected = gpsToMap(
            fix.lat + northMeters / 111132,
            fix.lng + eastMeters / (111320 * Math.cos(latRad))
        );
        if (!projected) return;
        points.push(`${i === 0 ? "M" : "L"}${(projected.x + gpsCalibrationOffset.x).toFixed(1)},${(projected.y + gpsCalibrationOffset.y).toFixed(1)}`);
    }
    gpsAccuracyPath.setAttribute("d", points.join(" ") + " Z");
    gpsAccuracySvg.style.display = "block";
}

function setGpsQuality(message, level = "ok") {
    gpsQuality.textContent = message;
    gpsQuality.dataset.level = level;
    gpsQuality.hidden = false;
}

function hideGpsLocation() {
    userLocationMarker.style.display = "none";
    gpsAccuracySvg.style.display = "none";
}

function renderGpsLocation() {
    if (!gpsLastFix) return;
    const fix = gpsLastFix;
    const point = gpsToMap(fix.lat, fix.lng);
    if (!point) {
        hideGpsLocation();
        setGpsQuality("位置を地図へ変換できません", "warn");
        return;
    }

    point.x += gpsCalibrationOffset.x;
    point.y += gpsCalibrationOffset.y;
    const mapHeight = map.offsetHeight || 800;
    const onImage = point.x >= 0 && point.x <= 1080 && point.y >= 0 && point.y <= mapHeight;
    const onCampus = isInsideMainCampus(point.x, point.y);

    gpsButton.classList.remove("loading");
    gpsButton.classList.add("active");
    gpsCalibrationButton.hidden = false;

    const accuracy = Math.round(fix.accuracy);
    if (fix.accuracy > 120) {
        hideGpsLocation();
        setGpsQuality(`⚠️ 測位誤差 約${accuracy}m。精度が低いためピンを非表示にしています`, "warn");
        return;
    }

    if (!onImage) {
        hideGpsLocation();
        setGpsQuality(`📍 地図の範囲外と推定されました（誤差 約${accuracy}m）。位置補正もできます`, "warn");
        return;
    }

    userLocationMarker.style.left = `${point.x}px`;
    userLocationMarker.style.top = `${point.y}px`;
    userLocationMarker.style.display = "block";
    drawGpsAccuracy(fix);

    const adjusted = (gpsCalibrationOffset.x !== 0 || gpsCalibrationOffset.y !== 0) ? "・位置補正中" : "";
    const level = fix.accuracy > 30 || !onCampus ? "warn" : "ok";
    const caution = !onCampus ? "・キャンパス境界外の可能性" : "";
    setGpsQuality(`📍 現在地の推定誤差 約${accuracy}m${adjusted}${caution}`, level);
}

function updateUserLocation(position) {
    const coords = position && position.coords;
    if (!coords) return;

    const lat = Number(coords.latitude);
    const lng = Number(coords.longitude);
    const accuracy = Number(coords.accuracy);
    const timestamp = Number(position.timestamp) || Date.now();
    const now = Date.now();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        !Number.isFinite(accuracy) || accuracy <= 0 ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    // iOS・Androidのキャッシュ済み位置や古い測位を混ぜない。
    if (timestamp < now - 30000 || timestamp > now + 60000) return;
    if (gpsLastFix && timestamp <= gpsLastFix.timestamp) return;

    const next = { lat, lng, accuracy, timestamp };
    if (gpsLastFix) {
        const age = timestamp - gpsLastFix.timestamp;
        const movement = gpsDistanceMeters(next, gpsLastFix);
        const jumpThreshold = Math.max(80, gpsLastFix.accuracy + next.accuracy + 25);

        // 数秒で現実的でないジャンプは一度保留。次の測位も同方向なら採用。
        if (age > 0 && age < 6000 && movement > jumpThreshold) {
            if (!gpsOutlier || gpsDistanceMeters(next, gpsOutlier) > Math.max(50, next.accuracy * 2)) {
                gpsOutlier = next;
                return;
            }
        }
        gpsOutlier = null;

        // 新しい測位が極端に粗い場合、直前の良い測位を少し保持。
        if (age < 12000 && next.accuracy > gpsLastFix.accuracy * 2.5 &&
            movement > Math.max(10, gpsLastFix.accuracy)) {
            return;
        }

        // 立ち止まっている時のピンの小刻みな揺れを緩和する。
        // 移動中や10秒以上経過後は遅れが出ないよう、そのまま追従。
        if (age < 10000 && movement < Math.max(12, next.accuracy * 1.5) && movement < 30) {
            const alpha = Math.min(0.9, Math.max(0.35,
                gpsLastFix.accuracy / (gpsLastFix.accuracy + next.accuracy)));
            next.lat = gpsLastFix.lat * (1 - alpha) + next.lat * alpha;
            next.lng = gpsLastFix.lng * (1 - alpha) + next.lng * alpha;
        }
    }

    gpsLastFix = next;
    renderGpsLocation();
    if (!gpsHasShownFirstFix) {
        gpsHasShownFirstFix = true;
        showGpsStatus("現在地を表示。青い範囲は測位誤差の目安です");
    }
}

function closeGpsCalibration() {
    gpsCalibrationMode = false;
    document.body.classList.remove("gps-calibration-mode");
    gpsCalibrationPanel.hidden = true;
    gpsCalibrationButton.setAttribute("aria-pressed", "false");
}

gpsCalibrationButton.addEventListener("click", () => {
    if (!gpsLastFix || gpsWatchId === null) return;
    gpsCalibrationMode = !gpsCalibrationMode;
    document.body.classList.toggle("gps-calibration-mode", gpsCalibrationMode);
    gpsCalibrationPanel.hidden = !gpsCalibrationMode;
    gpsCalibrationButton.setAttribute("aria-pressed", String(gpsCalibrationMode));
});

gpsCalibrationCancel.addEventListener("click", closeGpsCalibration);

gpsCalibrationReset.addEventListener("click", () => {
    gpsCalibrationOffset = { x: 0, y: 0 };
    renderGpsLocation();
    closeGpsCalibration();
    showGpsStatus("地図上の位置補正を解除しました");
});

map.addEventListener("click", event => {
    if (!gpsCalibrationMode || !gpsLastFix) return;
    // モバイル表示の縮小（CSS scale）をもとの1080px座標へ戻す。
    const rect = mapContainer.getBoundingClientRect();
    const ratio = rect.width / mapContainer.offsetWidth;
    if (!ratio || !Number.isFinite(ratio)) return;
    const pickedX = (event.clientX - rect.left) / ratio;
    const pickedY = (event.clientY - rect.top) / ratio;
    const estimated = gpsToMap(gpsLastFix.lat, gpsLastFix.lng);
    if (!estimated) return;
    gpsCalibrationOffset = {
        x: pickedX - estimated.x,
        y: pickedY - estimated.y
    };
    closeGpsCalibration();
    renderGpsLocation();
    showGpsStatus("現在地の表示を補正しました。位置情報そのものの精度は変わりません");
});

function gpsError(error) {
    gpsButton.classList.remove("loading");
    if (error.code === error.TIMEOUT) {
        showGpsStatus("現在地の取得に時間がかかっています。空が見える場所で再試行してください");
        return; // watchPositionは継続して後続の測位を待つ
    }
    if (gpsWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }
    updateMenuGPSState(false);
    gpsButton.classList.remove("active");
    gpsQuality.hidden = true;
    gpsCalibrationButton.hidden = true;
    closeGpsCalibration();
    hideGpsLocation();
    if (error.code === error.PERMISSION_DENIED) {
        showGpsStatus("位置情報が許可されていません。ブラウザ・端末の設定をご確認ください");
    } else {
        showGpsStatus("現在地を取得できません。Wi-Fiと位置情報設定を確認してください");
    }
}

function startGPS() {
    if (!navigator.geolocation) {
        showGpsStatus("このブラウザは位置情報に対応していません");
        updateMenuGPSState(false);
        return;
    }
    if (!window.isSecureContext) {
        showGpsStatus("現在地の使用にはHTTPS接続が必要です（localhostを除く）");
        updateMenuGPSState(false);
        return;
    }
    if (gpsWatchId !== null) return;

    gpsLastFix = null;
    gpsOutlier = null;
    gpsHasShownFirstFix = false;
    gpsButton.classList.add("loading");
    setGpsQuality("📍 位置情報を取得しています…");
    showGpsStatus("位置情報の使用を許可してください。Wi-Fiをオンにすると改善する場合があります");

    try {
        gpsWatchId = navigator.geolocation.watchPosition(
            updateUserLocation,
            gpsError,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
        updateMenuGPSState(true);
    } catch (error) {
        gpsWatchId = null;
        gpsButton.classList.remove("loading");
        gpsQuality.hidden = true;
        updateMenuGPSState(false);
        showGpsStatus("位置情報を開始できませんでした");
    }
}

function stopGPS() {
    if (gpsWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchId);
    }
    gpsWatchId = null;
    gpsLastFix = null;
    gpsOutlier = null;
    gpsHasShownFirstFix = false;
    hideGpsLocation();
    gpsQuality.hidden = true;
    gpsCalibrationButton.hidden = true;
    closeGpsCalibration();
    gpsButton.classList.remove("active", "loading");
    updateMenuGPSState(false);
    showGpsStatus("現在地表示を停止しました");
}

gpsButton.addEventListener("click", () => {
    if (gpsWatchId === null) startGPS();
    else stopGPS();
});

/* GPSは初期OFF。メニューまたは地図上のボタンを押して開始 */

//////////////////////////////////////////////////
// バス時刻・カウントダウン
// 椥辻・山科・京都駅・大宅
//////////////////////////////////////////////////

const busLiveInfo =
    document.getElementById("bus-live-info");

const nextBusTime =
    document.getElementById("next-bus-time");

const busCountdown =
    document.getElementById("bus-countdown");

const busRouteName =
    document.getElementById("bus-route-name");

const busStatus =
    document.getElementById("bus-status");

const busDirectionButtons =
    document.querySelectorAll(".bus-direction-btn");


let busCountdownTimer = null;


/*
=========================================
到着予定時刻の計算に使う標準所要時間（分）
道路状況で前後するため画面では「着目安」と表示
=========================================
*/
const BUS_TRAVEL_MINUTES = {
    nagitsuji: {
        fromUniversity: 10,
        toUniversity: 10
    },
    yamashina: {
        fromUniversity: 18,
        toUniversity: 18
    },
    yamashinaOyake: {
        fromUniversity: 13,
        toUniversity: 13
    },
    kyoto: {
        fromUniversity: 26,
        toUniversity: 26
    },
    oyake: {
        fromUniversity: 37,
        toUniversity: 37
    }
};

let busUpcomingWrap = null;
let busUpcomingSlider = null;
let busUpcomingSignature = "";


//////////////////////////////////////////////////
// 次の便以降のスライダーをHTMLへ自動追加
//////////////////////////////////////////////////

function ensureBusUpcomingSlider() {

    if (busUpcomingWrap) {
        return;
    }

    busUpcomingWrap =
        document.createElement("div");

    busUpcomingWrap.className =
        "bus-upcoming-wrap";

    const title =
        document.createElement("div");

    title.className =
        "bus-upcoming-title";

    title.textContent =
        "次の便以降";

    busUpcomingSlider =
        document.createElement("div");

    busUpcomingSlider.id =
        "bus-upcoming-slider";

    busUpcomingSlider.className =
        "bus-upcoming-slider";

    const hint =
        document.createElement("div");

    hint.className =
        "bus-upcoming-hint";

    hint.textContent =
        "← 横にスワイプして先の便を確認 →";

    busUpcomingWrap.appendChild(title);
    busUpcomingWrap.appendChild(busUpcomingSlider);
    busUpcomingWrap.appendChild(hint);

    if (busCountdown) {
        busCountdown.insertAdjacentElement(
            "afterend",
            busUpcomingWrap
        );
    } else if (busLiveInfo) {
        busLiveInfo.appendChild(busUpcomingWrap);
    }
}


/*
=========================================
現在選択中

route:
nagitsuji
yamashina
kyoto

direction:
fromUniversity = 大学発
toUniversity   = 大学行き
=========================================
*/

let selectedBusRoute =
    "nagitsuji";

let selectedBusDirection =
    "fromUniversity";

/*
山科・京都駅は発着地点を切替
university = 京都橘大学発着
oyake      = 大宅発着
椥辻は大学発着のみ
*/
let selectedBusStopMode =
    "university";


//////////////////////////////////////////////////
// バス時刻表
//////////////////////////////////////////////////

const BUS_TIMETABLE = {


    //////////////////////////////////////////////////
    // 椥辻
    //////////////////////////////////////////////////

    nagitsuji: {

        name:"椥辻",

        fromUniversity: {

            weekday: [

                "07:20",
                "07:30",
                "07:35",
                "07:55",

                "08:00",
                "08:05",
                "08:20",
                "08:25",
                "08:30",
                "08:35",
                "08:45",
                "08:55",

                "09:05",
                "09:10",
                "09:25",
                "09:35",
                "09:45",
                "09:50",
                "09:55",

                "10:05",
                "10:15",
                "10:20",
                "10:25",
                "10:35",
                "10:45",
                "10:50",

                "11:05",
                "11:45",

                "12:15",
                "12:40",
                "12:50",

                "13:05",
                "13:20",
                "13:35",
                "13:50",

                "14:00",
                "14:15",
                "14:30",

                "15:10",
                "15:15",
                "15:45",

                "16:00",
                "16:15",
                "16:30",
                "16:45",

                "17:00",
                "17:15",
                "17:30",
                "17:45",

                "18:10",
                "18:35",

                "19:10",
                "19:40",

                "20:10",
                "20:40"
            ],

            saturday:[],

            sunday:[]
        },


        toUniversity: {

            weekday: [

                "07:45",
                "07:50",
                "07:55",

                "08:10",
                "08:15",
                "08:20",
                "08:25",
                "08:35",
                "08:40",
                "08:45",
                "08:50",

                "09:05",
                "09:15",
                "09:20",
                "09:25",
                "09:45",
                "09:55",

                "10:05",
                "10:10",
                "10:15",
                "10:25",
                "10:35",
                "10:40",
                "10:45",
                "10:55",

                "11:05",
                "11:10",
                "11:20",

                "12:05",
                "12:35",
                "12:55",

                "13:10",
                "13:25",
                "13:40",
                "13:50",

                "14:05",
                "14:20",
                "14:30",
                "14:45",

                "15:25",
                "15:30",

                "16:00",
                "16:15",
                "16:30",
                "16:45",

                "17:00",
                "17:15",
                "17:30",
                "17:45",

                "18:00",
                "18:25",
                "18:50",

                "19:25",
                "19:55",

                "20:25",
                "20:55"
            ],

            saturday:[],

            sunday:[]
        }

    },


    //////////////////////////////////////////////////
    // 山科
    //////////////////////////////////////////////////

    yamashina: {

        name:"山科駅",

        fromUniversity: {

            weekday: [

                "09:48",

                "10:18",
                "10:48",

                "11:18",
                "11:48",

                "12:18",
                "12:45",
                "12:48",
                "12:55",

                "13:18",
                "13:48",

                "14:18",
                "14:48",

                "15:10",
                "15:13",
                "15:18",
                "15:21",
                "15:24",
                "15:47",

                "16:18",
                "16:47",

                "17:00",
                "17:03",
                "17:06",
                "17:10",
                "17:14",
                "17:16",
                "17:35",

                "18:13",
                "18:53",

                "19:00",
                "19:03",
                "19:06",
                "19:10",
                "19:55",

                "20:50",
                "20:55",

                "21:05"
            ],

            saturday: [

                "12:48",
                "14:48",
                "16:08",
                "16:48"

            ],

            sunday:[]
        },


        toUniversity: {

            weekday: [

                "07:53",

                "08:04",
                "08:09",
                "08:12",
                "08:15",
                "08:17",
                "08:20",
                "08:22",
                "08:25",
                "08:27",
                "08:30",
                "08:32",
                "08:35",
                "08:37",
                "08:40",
                "08:58",

                "09:25",
                "09:55",

                "10:12",
                "10:15",
                "10:18",
                "10:21",
                "10:24",
                "10:27",
                "10:30",
                "10:55",

                "11:25",
                "11:55",

                "12:25",
                "12:45",
                "12:53",
                "12:55",

                "13:25",
                "13:55",

                "14:25",
                "14:55",

                "15:25",
                "15:55",

                "16:25",
                "16:55"
            ],

            saturday: [

                "08:31",
                "09:45",
                "12:25",
                "14:25"

            ],

            sunday:[]
        }

    },


    //////////////////////////////////////////////////
    // 山科駅 ↔ 大宅
    // 26系統（大宅発着便）
    //////////////////////////////////////////////////

    yamashinaOyake: {

        name:"山科駅",

        /*
        fromUniversity は既存UIとの互換性のため
        「大宅発 → 山科駅行き」として使用
        */
        fromUniversity: {

            // 26系統 + 26A系統（同じ「大宅」停留所）
            weekday: [
                "06:23",
                "06:53",
                "07:14",
                "07:34",
                "07:49",
                "08:04",
                "08:22",
                "08:49",
                "09:20",
                "09:52",
                "10:22",
                "10:52",
                "11:22",
                "11:52",
                "12:22",
                "12:52",
                "13:22",
                "13:52",
                "14:22",
                "14:52",
                "15:22",
                "15:51",
                "16:22",
                "16:51",
                "17:20",
                "17:39",
                "18:17",
                "18:57",
                "19:59",
                "20:59",
                "21:40"
            ],

            saturday: [
                "06:43",
                "07:23",
                "08:05",
                "08:45",
                "09:25",
                "10:05",
                "10:45",
                "11:25",
                "12:05",
                "12:45",
                "12:52",
                "13:25",
                "14:05",
                "14:45",
                "14:52",
                "15:25",
                "16:05",
                "16:12",
                "16:44",
                "16:52",
                "17:24",
                "18:05",
                "18:45",
                "19:25"
            ],

            sunday: [
                "06:43",
                "07:23",
                "08:05",
                "08:45",
                "09:25",
                "10:05",
                "10:45",
                "11:25",
                "12:05",
                "12:45",
                "13:25",
                "14:05",
                "14:45",
                "15:25",
                "16:05",
                "16:44",
                "17:24",
                "18:05",
                "18:45",
                "19:25"
            ]
        },

        /*
        toUniversity は既存UIとの互換性のため
        「山科駅発 → 大宅行き」として使用
        */
        toUniversity: {

            // 26系統 + 26A系統（山科駅発、同じ「大宅」停留所まで）
            weekday: [
                "06:50",
                "07:38",
                "07:53",
                "08:09",
                "08:58",
                "09:25",
                "09:55",
                "10:18",
                "10:55",
                "11:25",
                "11:55",
                "12:25",
                "12:55",
                "13:25",
                "13:55",
                "14:25",
                "14:55",
                "15:25",
                "15:55",
                "16:25",
                "16:55",
                "17:25",
                "17:55",
                "18:25",
                "18:55",
                "19:25",
                "20:25",
                "21:20",
                "21:55"
            ],

            saturday: [
                "07:10",
                "07:50",
                "08:31",
                "09:05",
                "09:45",
                "10:25",
                "11:05",
                "11:45",
                "12:25",
                "13:05",
                "13:45",
                "14:25",
                "15:07",
                "15:45",
                "16:25",
                "17:05",
                "17:45",
                "18:25",
                "19:05",
                "19:45",
                "20:25",
                "21:11"
            ],

            sunday: [
                "07:10",
                "07:50",
                "08:31",
                "09:05",
                "09:45",
                "10:25",
                "11:05",
                "11:45",
                "12:25",
                "13:05",
                "13:45",
                "14:25",
                "15:07",
                "15:45",
                "16:25",
                "17:05",
                "17:45",
                "18:25",
                "19:05",
                "19:45",
                "20:25",
                "21:11"
            ]
        }

    },


    //////////////////////////////////////////////////
    // 京都駅
    //
    // 京都橘大学へ直接乗り入れる便を表示
    //////////////////////////////////////////////////

    kyoto: {

        name:"京都駅八条口",

        fromUniversity: {

            weekday: [

                "11:08",
                "13:08",
                "15:11",
                "17:11",
                "19:00",
                "19:50",
                "21:15"

            ],

            saturday:[],

            sunday:[]
        },


        toUniversity: {

            weekday: [

                "08:16",

                "10:18",

                "12:21",

                "14:21",

                "16:21"

            ],

            saturday:[],

            sunday:[]
        }

    },


    //////////////////////////////////////////////////
    // 大宅 ↔ 京都駅八条口
    // 山科↔大宅と同じ「大宅」停留所を使用
    // 京阪バス 311系統
    //////////////////////////////////////////////////

    oyake: {

        name:"京都駅八条口",

        fromUniversity: {

            // 大宅 → 京都駅八条口
            weekday: [
                "07:00",
                "08:18",
                "09:18",
                "10:19",
                "11:19",
                "12:19",
                "13:19",
                "14:19",
                "15:19",
                "16:44",
                "17:18",
                "18:23",
                "19:23"
            ],

            saturday: [
                "07:14",
                "08:15",
                "09:15",
                "10:15",
                "11:15",
                "12:15",
                "13:15",
                "14:15",
                "15:15",
                "16:20",
                "17:21",
                "18:21",
                "19:20"
            ],

            sunday: [
                "07:14",
                "08:15",
                "09:15",
                "10:15",
                "11:15",
                "12:15",
                "13:15",
                "14:15",
                "15:15",
                "16:20",
                "17:21",
                "18:21",
                "19:20"
            ]
        },

        toUniversity: {

            // 京都駅八条口 → 大宅
            weekday: [
                "07:34",
                "09:09",
                "10:09",
                "11:09",
                "12:09",
                "13:09",
                "14:09",
                "15:09",
                "16:09",
                "17:14",
                "18:14",
                "19:19",
                "20:19"
            ],

            saturday: [
                "08:09",
                "09:09",
                "10:09",
                "11:09",
                "12:09",
                "13:09",
                "14:09",
                "15:09",
                "16:09",
                "17:13",
                "18:13",
                "19:14",
                "20:11"
            ],

            sunday: [
                "08:09",
                "09:09",
                "10:09",
                "11:09",
                "12:09",
                "13:09",
                "14:09",
                "15:09",
                "16:09",
                "17:13",
                "18:13",
                "19:14",
                "20:11"
            ]
        }

    }

};


//////////////////////////////////////////////////
// 2026年度 学休期
//////////////////////////////////////////////////

const UNIVERSITY_RECESS_PERIODS = [
    {
        start: "2026-07-30",
        end:   "2026-09-23"
    }
];


function localDateFromYmd(ymd, endOfDay = false) {

    const [year, month, day] =
        ymd.split("-").map(Number);

    return new Date(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
    );
}


function isUniversityRecess(date) {

    return UNIVERSITY_RECESS_PERIODS.some(
        function (period) {

            const start =
                localDateFromYmd(period.start);

            const end =
                localDateFromYmd(period.end, true);

            return (
                date >= start &&
                date <= end
            );
        }
    );
}


//////////////////////////////////////////////////
// 日本の祝日・休日
// 2026 / 2027
//////////////////////////////////////////////////

const JAPANESE_HOLIDAYS = new Set([

    // 2026
    "2026-01-01",
    "2026-01-12",
    "2026-02-11",
    "2026-02-23",
    "2026-03-20",
    "2026-04-29",
    "2026-05-03",
    "2026-05-04",
    "2026-05-05",
    "2026-05-06",
    "2026-07-20",
    "2026-08-11",
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-10-12",
    "2026-11-03",
    "2026-11-23",

    // 2027
    "2027-01-01",
    "2027-01-11",
    "2027-02-11",
    "2027-02-23",
    "2027-03-21",
    "2027-03-22",
    "2027-04-29",
    "2027-05-03",
    "2027-05-04",
    "2027-05-05",
    "2027-07-19",
    "2027-08-11",
    "2027-09-20",
    "2027-09-23",
    "2027-10-11",
    "2027-11-03",
    "2027-11-23"
]);


function getLocalDateKey(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function isJapaneseHoliday(date) {

    return JAPANESE_HOLIDAYS.has(
        getLocalDateKey(date)
    );
}


//////////////////////////////////////////////////
// 今日の曜日区分
//////////////////////////////////////////////////

function getBusDayType(date) {

    if (isJapaneseHoliday(date)) {
        return "sunday";
    }

    const day =
        date.getDay();

    if (day === 0) {
        return "sunday";
    }

    if (day === 6) {
        return "saturday";
    }

    return "weekday";
}


//////////////////////////////////////////////////
// 選択中の発着地点から実際の時刻表キーを決定
//////////////////////////////////////////////////

function getEffectiveBusRouteKey() {

    if (
        selectedBusRoute === "yamashina" &&
        selectedBusStopMode === "oyake"
    ) {
        return "yamashinaOyake";
    }

    if (
        selectedBusRoute === "kyoto" &&
        selectedBusStopMode === "oyake"
    ) {
        return "oyake";
    }

    return selectedBusRoute;
}


//////////////////////////////////////////////////
// バスUI表示同期
//////////////////////////////////////////////////

function syncBusRouteButtons() {

    document
        .querySelectorAll(".bus-route-btn")
        .forEach(function (button) {

            button.classList.toggle(
                "active",
                button.dataset.route === selectedBusRoute
            );
        });
}


function syncBusDirectionButtons() {

    busDirectionButtons.forEach(function (button) {

        const isOyake =
            button.dataset.stopMode === "oyake";

        /*
        椥辻は大学 ↔ 椥辻のみなので
        大宅発・大宅着は表示しない
        */
        if (
            selectedBusRoute === "nagitsuji" &&
            isOyake
        ) {
            button.hidden = true;
        } else {
            button.hidden = false;
        }

        const isSelected =
            button.dataset.stopMode === selectedBusStopMode &&
            button.dataset.direction === selectedBusDirection;

        button.classList.toggle(
            "active",
            isSelected
        );
    });
}


//////////////////////////////////////////////////
// 時刻表取得
//////////////////////////////////////////////////

function getTodayBusTimetable() {

    const now =
        new Date();

    /*
    椥辻シャトルは学休期原則運休
    */

    if (
        selectedBusRoute === "nagitsuji" &&
        isUniversityRecess(now)
    ) {
        return [];
    }

    const effectiveRouteKey =
        getEffectiveBusRouteKey();

    const route =
        BUS_TIMETABLE[effectiveRouteKey];

    if (!route) {
        return [];
    }

    const direction =
        route[selectedBusDirection];

    if (!direction) {
        return [];
    }

    const dayType =
        getBusDayType(now);

    return direction[dayType] || [];
}


//////////////////////////////////////////////////
// HH:MM を今日の日付のDateへ変換
//////////////////////////////////////////////////

function busTimeToDate(time, baseDate = new Date()) {

    const [hour, minute] =
        time.split(":").map(Number);

    const date =
        new Date(baseDate);

    date.setHours(
        hour,
        minute,
        0,
        0
    );

    return date;
}


//////////////////////////////////////////////////
// 到着予定時刻
//////////////////////////////////////////////////

function getBusTravelMinutes() {

    const effectiveRouteKey =
        getEffectiveBusRouteKey();

    const routeMinutes =
        BUS_TRAVEL_MINUTES[effectiveRouteKey];

    if (!routeMinutes) {
        return 0;
    }

    return routeMinutes[selectedBusDirection] || 0;
}


function getBusArrivalDate(departureDate) {

    const arrival =
        new Date(departureDate);

    arrival.setMinutes(
        arrival.getMinutes() +
        getBusTravelMinutes()
    );

    return arrival;
}


function formatBusClock(date) {

    return (
        String(date.getHours()).padStart(2, "0") +
        ":" +
        String(date.getMinutes()).padStart(2, "0")
    );
}


//////////////////////////////////////////////////
// この先のバスを最大8便取得
//////////////////////////////////////////////////

function getUpcomingBuses(limit = 8) {

    const timetable =
        getTodayBusTimetable();

    if (
        !timetable ||
        timetable.length === 0
    ) {
        return [];
    }

    const now =
        new Date();

    const buses = [];

    for (const time of timetable) {

        const departure =
            busTimeToDate(time, now);

        if (departure <= now) {
            continue;
        }

        const arrival =
            getBusArrivalDate(departure);

        buses.push({
            time: time,
            date: departure,
            arrivalDate: arrival,
            arrivalTime: formatBusClock(arrival)
        });

        if (buses.length >= limit) {
            break;
        }
    }

    return buses;
}


//////////////////////////////////////////////////
// 次のバス
//////////////////////////////////////////////////

function getNextBus() {

    const buses =
        getUpcomingBuses(1);

    return buses.length > 0
        ? buses[0]
        : null;
}


//////////////////////////////////////////////////
// 残り時間
//////////////////////////////////////////////////

function getCountdownText(departure) {

    const now =
        new Date();

    let remaining =
        departure.getTime() -
        now.getTime();

    remaining =
        Math.max(remaining, 0);

    const totalSeconds =
        Math.floor(remaining / 1000);

    const hours =
        Math.floor(totalSeconds / 3600);

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        totalSeconds % 60;

    let text = "";

    if (hours > 0) {
        text += hours + "時間 ";
    }

    text +=
        String(minutes).padStart(2, "0") +
        "分 " +
        String(seconds).padStart(2, "0") +
        "秒";

    return text;
}


//////////////////////////////////////////////////
// 次の便以降スライダー
//////////////////////////////////////////////////

function clearUpcomingBusSlider() {

    ensureBusUpcomingSlider();

    busUpcomingSignature = "";

    if (busUpcomingSlider) {
        busUpcomingSlider.innerHTML = "";
    }

    if (busUpcomingWrap) {
        busUpcomingWrap.hidden = true;
    }
}


function updateUpcomingCountdownTexts() {

    if (!busUpcomingSlider) {
        return;
    }

    busUpcomingSlider
        .querySelectorAll(".bus-upcoming-countdown")
        .forEach(function (element) {

            const timestamp =
                Number(element.dataset.departureTime);

            if (!Number.isFinite(timestamp)) {
                return;
            }

            element.textContent =
                "発車まで " +
                getCountdownText(
                    new Date(timestamp)
                );
        });
}


function renderUpcomingBusSlider(buses) {

    ensureBusUpcomingSlider();

    if (
        !buses ||
        buses.length === 0
    ) {
        clearUpcomingBusSlider();
        return;
    }

    busUpcomingWrap.hidden = false;

    const effectiveRouteKey =
        getEffectiveBusRouteKey();

    const signature = [
        effectiveRouteKey,
        selectedBusDirection,
        ...buses.map(bus => bus.time)
    ].join("|");

    /*
    同じ便一覧ならDOMを作り直さない。
    これによりスワイプ中でも1秒更新で位置が戻らない。
    */
    if (signature !== busUpcomingSignature) {

        busUpcomingSignature = signature;
        busUpcomingSlider.innerHTML = "";

        buses.forEach(function (bus, index) {

            const card =
                document.createElement("article");

            card.className =
                "bus-upcoming-card" +
                (index === 0 ? " is-next" : "");

            const number =
                document.createElement("div");

            number.className =
                "bus-upcoming-number";

            number.textContent =
                index === 0
                    ? "次のバス"
                    : (index + 1) + "本目";

            const times =
                document.createElement("div");

            times.className =
                "bus-upcoming-times";

            times.innerHTML =
                '<div class="bus-upcoming-time-box">' +
                    '<span class="bus-upcoming-time-label">発</span>' +
                    '<strong>' + bus.time + '</strong>' +
                '</div>' +
                '<span class="bus-upcoming-arrow">→</span>' +
                '<div class="bus-upcoming-time-box">' +
                    '<span class="bus-upcoming-time-label">着目安</span>' +
                    '<strong>' + bus.arrivalTime + '</strong>' +
                '</div>';

            const countdown =
                document.createElement("div");

            countdown.className =
                "bus-upcoming-countdown";

            countdown.dataset.departureTime =
                String(bus.date.getTime());

            card.appendChild(number);
            card.appendChild(times);
            card.appendChild(countdown);

            busUpcomingSlider.appendChild(card);
        });

        /* 路線切替時は必ず先頭の次便から表示 */
        busUpcomingSlider.scrollLeft = 0;
    }

    updateUpcomingCountdownTexts();
}


//////////////////////////////////////////////////
// 路線名表示
//////////////////////////////////////////////////

function updateBusRouteName() {

    const effectiveRouteKey =
        getEffectiveBusRouteKey();

    if (effectiveRouteKey === "yamashinaOyake") {

        if (
            selectedBusDirection ===
            "fromUniversity"
        ) {

            busRouteName.textContent =
                "大宅 → 山科駅";

        } else {

            busRouteName.textContent =
                "山科駅 → 大宅";
        }

        return;
    }

    if (effectiveRouteKey === "oyake") {

        const oyakeName =
            "大宅";

        if (
            selectedBusDirection ===
            "fromUniversity"
        ) {

            busRouteName.textContent =
                oyakeName +
                " → 京都駅八条口";

        } else {

            busRouteName.textContent =
                "京都駅八条口 → " +
                oyakeName;
        }

        return;
    }

    const route =
        BUS_TIMETABLE[effectiveRouteKey];

    if (!route) {
        busRouteName.textContent = "";
        return;
    }

    if (
        selectedBusDirection ===
        "fromUniversity"
    ) {

        busRouteName.textContent =
            "京都橘大学 → " +
            route.name;

    } else {

        busRouteName.textContent =
            route.name +
            " → 京都橘大学";
    }
}


//////////////////////////////////////////////////
// 表示更新
//////////////////////////////////////////////////

function updateBusCountdown() {

    const now =
        new Date();

    const effectiveRouteKey =
        getEffectiveBusRouteKey();

    syncBusRouteButtons();
    syncBusDirectionButtons();
    updateBusRouteName();

    /*
    椥辻シャトル：学休期は原則運休
    */

    if (
        selectedBusRoute === "nagitsuji" &&
        isUniversityRecess(now)
    ) {

        nextBusTime.textContent =
            "--:--";

        busCountdown.textContent =
            "学休期は原則運休";

        busStatus.textContent =
            "臨時運行日は大学案内をご確認ください";

        clearUpcomingBusSlider();

        return;
    }

    const upcomingBuses =
        getUpcomingBuses(8);

    if (upcomingBuses.length === 0) {

        nextBusTime.textContent =
            "--:--";

        clearUpcomingBusSlider();

        const dayType =
            getBusDayType(now);

        if (
            selectedBusRoute === "kyoto" &&
            selectedBusStopMode === "university" &&
            (
                dayType === "saturday" ||
                dayType === "sunday"
            )
        ) {

            busCountdown.textContent =
                "本日は大学発着便がありません";

            busStatus.textContent =
                "大宅発・大宅着を選ぶと通常便を確認できます";

        } else {

            busCountdown.textContent =
                "本日の運行は終了しました";

            busStatus.textContent =
                "";
        }

        return;
    }

    const nextBus =
        upcomingBuses[0];

    nextBusTime.innerHTML =
        '<span class="bus-main-time-item">' +
            '<small>発</small>' +
            nextBus.time +
        '</span>' +
        '<span class="bus-main-time-arrow">→</span>' +
        '<span class="bus-main-time-item">' +
            '<small>着目安</small>' +
            nextBus.arrivalTime +
        '</span>';

    busCountdown.textContent =
        "発車まで " +
        getCountdownText(nextBus.date);

    renderUpcomingBusSlider(
        upcomingBuses
    );

    if (effectiveRouteKey === "yamashinaOyake") {

        busStatus.textContent =
            "山科駅 ↔ 大宅（26・26A）の便を表示中 ※到着は目安";

    } else if (effectiveRouteKey === "oyake") {

        busStatus.textContent =
            "京都駅八条口 ↔ 大宅（311）の便を表示中 ※到着は目安";

    } else if (
        selectedBusRoute === "kyoto" &&
        selectedBusStopMode === "university" &&
        isUniversityRecess(now)
    ) {

        busStatus.textContent =
            "学休期は大宅発・大宅着も確認できます ※到着は目安";

    } else {

        busStatus.textContent =
            "登録済み時刻表から計算中（最新ダイヤ・遅延情報は公式サイトを確認）";
    }
}


//////////////////////////////////////////////////
// 路線切替：3つのうち1つだけ選択
//////////////////////////////////////////////////

document
    .querySelectorAll(".bus-route-btn")
    .forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                selectedBusRoute =
                    this.dataset.route;

                /*
                路線を切り替えたら大学発を初期選択。
                activeはsync関数で必ず1つだけになる。
                */
                selectedBusStopMode =
                    "university";

                selectedBusDirection =
                    "fromUniversity";

                busUpcomingSignature = "";

                syncBusRouteButtons();
                syncBusDirectionButtons();
                updateBusCountdown();
            }
        );
    });


//////////////////////////////////////////////////
// 発着切替：4つのうち1つだけ選択
//////////////////////////////////////////////////

busDirectionButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            /*
            椥辻では大宅発・大宅着を選択不可
            */
            if (
                selectedBusRoute === "nagitsuji" &&
                this.dataset.stopMode === "oyake"
            ) {
                return;
            }

            selectedBusStopMode =
                this.dataset.stopMode;

            selectedBusDirection =
                this.dataset.direction;

            busUpcomingSignature = "";

            syncBusDirectionButtons();
            updateBusCountdown();
        }
    );
});


//////////////////////////////////////////////////
// バスポップアップ開始
//////////////////////////////////////////////////

function startBusInformation() {

    clearInterval(busCountdownTimer);

    busLiveInfo.hidden = false;

    ensureBusUpcomingSlider();

    syncBusRouteButtons();
    syncBusDirectionButtons();
    updateBusCountdown();

    /*
    1秒ごとに更新。
    発車時刻を過ぎると自動で次便へ切り替わる。
    */

    busCountdownTimer =
        setInterval(
            updateBusCountdown,
            1000
        );
}


//////////////////////////////////////////////////
// バス以外・ポップアップ終了
//////////////////////////////////////////////////

function stopBusInformation() {

    clearInterval(busCountdownTimer);

    busCountdownTimer = null;

    if (busLiveInfo) {
        busLiveInfo.hidden = true;
    }
}


//////////////////////////////////////////////////
// 三本線メニュー
//////////////////////////////////////////////////

const menuButton =
    document.getElementById("menu-button");

const sideMenu =
    document.getElementById("side-menu");

const menuClose =
    document.getElementById("menu-close");

const menuOverlay =
    document.getElementById("menu-overlay");

const menuMap =
    document.getElementById("menu-map");

const menuTimetable =
    document.getElementById("menu-timetable");

const timetableOverlay =
    document.getElementById("timetable-overlay");

const timetableClose =
    document.getElementById("timetable-close");

const menuToilet =
    document.getElementById("menu-toilet");

const menuGeneralToilet =
    document.getElementById("menu-toilet-general");

const menuAED =
    document.getElementById("menu-aed");

const menuGps =
    document.getElementById("menu-gps");


//////////////////////////////////////////////////
// メニューを開く
//////////////////////////////////////////////////

function openMenu() {

    if (!sideMenu || !menuOverlay) {
        return;
    }

    sideMenu.classList.add("active");

    menuOverlay.classList.add("active");

    sideMenu.setAttribute(
        "aria-hidden",
        "false"
    );

    menuOverlay.setAttribute(
        "aria-hidden",
        "false"
    );

    if (menuButton) {

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }
}


//////////////////////////////////////////////////
// メニューを閉じる
//////////////////////////////////////////////////

function closeMenu() {

    if (!sideMenu || !menuOverlay) {
        return;
    }

    sideMenu.classList.remove("active");

    menuOverlay.classList.remove("active");

    sideMenu.setAttribute(
        "aria-hidden",
        "true"
    );

    menuOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    if (menuButton) {

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


//////////////////////////////////////////////////
// 三本線ボタン
//////////////////////////////////////////////////

if (menuButton) {

    menuButton.addEventListener(
        "click",
        openMenu
    );
}


//////////////////////////////////////////////////
// ×ボタン
//////////////////////////////////////////////////

if (menuClose) {

    menuClose.addEventListener(
        "click",
        closeMenu
    );
}


//////////////////////////////////////////////////
// メニュー外側をクリック
//////////////////////////////////////////////////

if (menuOverlay) {

    menuOverlay.addEventListener(
        "click",
        closeMenu
    );
}


//////////////////////////////////////////////////
// ESCキー
//////////////////////////////////////////////////

document.addEventListener(
    "keydown",
    function (e) {

        if (e.key === "Escape") {

            closeMenu();

            if (timetableOverlay) {

                timetableOverlay.classList.remove(
                    "active"
                );
            }
        }
    }
);


//////////////////////////////////////////////////
// キャンパスマップ
//////////////////////////////////////////////////

if (menuMap) {

    menuMap.addEventListener(
        "click",
        function () {

            closeMenu();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );
}


//////////////////////////////////////////////////
// メニューからバス情報を開く
//////////////////////////////////////////////////

const menuBus =
    document.getElementById("menu-bus");

if (menuBus) {
    menuBus.addEventListener("click", function () {

        closeMenu();

        // バス情報の表示を開始
        startBusInformation();

        // 建物のポップアップを開く
        if (popupOverlay) {
            popupOverlay.style.display = "flex";
        }
    });
}

//////////////////////////////////////////////////
// 時間割を開く
//////////////////////////////////////////////////

if (
    menuTimetable &&
    timetableOverlay
) {

    menuTimetable.addEventListener(
        "click",
        function () {

            // まずメニューを閉じる
            closeMenu();

            // そのあと時間割を表示
            timetableOverlay.hidden = false;
            timetableOverlay.classList.add("active");
        }
    );
}


//////////////////////////////////////////////////
// 時間割を閉じる
//////////////////////////////////////////////////

if (
    timetableClose &&
    timetableOverlay
) {

    timetableClose.addEventListener(
        "click",
        function () {

            timetableOverlay.classList.remove("active");
            timetableOverlay.hidden = true;
        }
    );
}


//////////////////////////////////////////////////
// 時間割の黒い部分をクリックして閉じる
//////////////////////////////////////////////////

if (timetableOverlay) {

    timetableOverlay.addEventListener(
        "click",
        function (e) {

            if (
                e.target === timetableOverlay
            ) {

                timetableOverlay.classList.remove(
                    "active"
                );
            }
        }
    );
}


//////////////////////////////////////////////////
// トイレ・AEDの表示切替（表示場所はCSVで管理）
//////////////////////////////////////////////////

if (menuToilet) {
    menuToilet.addEventListener("click", () => {
        setFacilityVisible("バリアフリートイレ", menuToilet.dataset.enabled !== "true");
        closeMenu();
    });
}

if (menuGeneralToilet) {
    menuGeneralToilet.addEventListener("click", () => {
        setFacilityVisible("一般トイレ", menuGeneralToilet.dataset.enabled !== "true");
        closeMenu();
    });
}

if (menuAED) {
    menuAED.addEventListener("click", () => {
        setFacilityVisible("AED", menuAED.dataset.enabled !== "true");
        closeMenu();
    });
}

//////////////////////////////////////////////////
// GPSメニュー表示の同期
//////////////////////////////////////////////////

function updateMenuGPSState(enabled) {
    if (!menuGps) return;

    menuGps.dataset.gpsEnabled = String(enabled);
    menuGps.setAttribute("aria-pressed", String(enabled));

    const state = menuGps.querySelector(".menu-toggle-state");
    if (state) state.textContent = enabled ? "ON" : "OFF";
}


//////////////////////////////////////////////////
// 現在地 ON / OFF
//////////////////////////////////////////////////

if (menuGps) {
    menuGps.addEventListener("click", function () {
        closeMenu();

        if (gpsWatchId === null) {
            startGPS();
        } else {
            stopGPS();
        }
    });
}

// ページ読み込み時はGPSを起動せず、OFF表示に統一
updateMenuGPSState(false);



//////////////////////////////////////////////////
// メニューのバス情報ボタン
//////////////////////////////////////////////////



if (menuBus) {
    menuBus.addEventListener("click", function () {

        // メニューを閉じる
        closeMenu();

        // バス情報を表示・更新
        startBusInformation();

        // ポップアップを表示
        if (popupOverlay) {
            popupOverlay.style.display = "flex";
        }

    });
}
