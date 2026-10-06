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
// 起動時自動読込
//////////////////////////////////////////////////

fetch("/static/buildings.json")
    .then(response => response.json())
    .then(data => {

        data.forEach(item => {

            createBuilding(
                item.name,
                item.x,
                item.y
            );
        });

        updateSearchList();
    })
    .catch(error => {

        console.log("buildings.jsonが見つかりません");

    });

//////////////////////////////////////////////////
// ポップアップを閉じる
//////////////////////////////////////////////////

closePopup.addEventListener("click", function () {

    popupOverlay.style.display = "none";

    stopBusInformation();

});

popupOverlay.addEventListener("click", function (e) {

    if (e.target === popupOverlay) {

        popupOverlay.style.display = "none";

        stopBusInformation();
    }
});

//////////////////////////////////////////////////
// 検索候補を作成
//////////////////////////////////////////////////

function updateSearchList() {

    const datalist =
        document.getElementById("buildingList");

    datalist.innerHTML = "";

    Object.keys(BUILDING_INFO).forEach(code => {

        const option =
            document.createElement("option");

        const name =
            BUILDING_INFO[code].fullName;

        option.value =
            code + " (" + name + ")";

        datalist.appendChild(option);
    });
}

//////////////////////////////////////////////////
// 検索文字から建物コードを取り出す
//////////////////////////////////////////////////

function getBuildingCode(value) {

    let keyword = value.trim();

    keyword =
        keyword.split(" ")[0];

    keyword =
        keyword.split("(")[0];

    return keyword.trim();
}

//////////////////////////////////////////////////
// 検索バー
//////////////////////////////////////////////////

const searchInput =
    document.getElementById("searchInput");

//////////////////////////////////////////////////
// 検索候補を選んだ時点でピンの色を変更
//////////////////////////////////////////////////

searchInput.addEventListener("input", function () {

    const keyword =
        getBuildingCode(this.value);

    const building =
        buildings.find(
            b => b.shortName === keyword
        );

    if (building) {

        highlightBuilding(building.shortName);

    } else {

        // 入力途中や検索欄が空の場合は選択を解除
        clearBuildingHighlight();
    }
});

//////////////////////////////////////////////////
// Enterを押したら建物情報を表示
//////////////////////////////////////////////////

searchInput.addEventListener("keydown", function (e) {

    if (e.key !== "Enter") return;

    const keyword =
        getBuildingCode(this.value);

    const building =
        buildings.find(
            b => b.shortName === keyword
        );

    if (!building) {

        alert("見つかりません");
        return;
    }

    building.element.click();
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
   現在地更新
========================================= */

function updateUserLocation(position) {

    const lat =
        position.coords.latitude;


    const lng =
        position.coords.longitude;


    const accuracy =
        position.coords.accuracy;


    console.log(
        "現在地"
    );


    console.log(
        "緯度:",
        lat
    );


    console.log(
        "経度:",
        lng
    );


    console.log(
        "精度:",
        accuracy,
        "m"
    );


    const point =
        gpsToMap(
            lat,
            lng
        );


    if (!point) {

        userLocationMarker.style.display =
            "none";

        return;
    }


    /* =================================
       キャンパス外判定
    ================================= */

    if (
        !isInsideMainCampus(
            point.x,
            point.y
        )
    ) {

        userLocationMarker.style.display =
            "none";


        gpsButton.classList.remove(
            "loading"
        );


        gpsButton.classList.remove(
            "active"
        );


        showGpsStatus(
            "現在地はキャンパス外です"
        );


        return;
    }


    /* =================================
       GPS精度がかなり悪い場合
    ================================= */

    if (
        accuracy > 100
    ) {

        userLocationMarker.style.display =
            "none";


        gpsButton.classList.remove(
            "loading"
        );


        showGpsStatus(
            "GPSの精度が低いため現在地を確認できません"
        );


        return;
    }


    /* =================================
       現在地マーカー表示
    ================================= */

    userLocationMarker.style.left =
        point.x + "px";


    userLocationMarker.style.top =
        point.y + "px";


    userLocationMarker.style.display =
        "block";


    gpsButton.classList.remove(
        "loading"
    );


    gpsButton.classList.add(
        "active"
    );


    showGpsStatus(

        "現在地を表示中　精度：約" +

        Math.round(
            accuracy
        ) +

        "m"

    );
}


/* =========================================
   GPSエラー
========================================= */

function gpsError(error) {

    gpsButton.classList.remove(
        "loading"
    );


    userLocationMarker.style.display =
        "none";


    if (
        error.code ===
        error.PERMISSION_DENIED
    ) {

        showGpsStatus(
            "位置情報の使用を許可してください"
        );

        return;
    }


    if (
        error.code ===
        error.POSITION_UNAVAILABLE
    ) {

        showGpsStatus(
            "現在地を取得できません"
        );

        return;
    }


    if (
        error.code ===
        error.TIMEOUT
    ) {

        showGpsStatus(
            "GPSの取得がタイムアウトしました"
        );

        return;
    }


    showGpsStatus(
        "GPSでエラーが発生しました"
    );
}


/* =========================================
   GPS開始
========================================= */

function startGPS() {

    if (
        !navigator.geolocation
    ) {

        showGpsStatus(
            "この端末では位置情報を利用できません"
        );

        return;
    }


    if (
        gpsWatchId !== null
    ) {

        return;
    }


    gpsButton.classList.add(
        "loading"
    );


    showGpsStatus(
        "現在地を取得しています…"
    );


    gpsWatchId =

        navigator.geolocation
            .watchPosition(

                updateUserLocation,

                gpsError,

                {

                    enableHighAccuracy:
                        true,

                    maximumAge:
                        1000,

                    timeout:
                        15000

                }

            );
}


/* =========================================
   GPS停止
========================================= */

function stopGPS() {

    if (
        gpsWatchId === null
    ) {

        return;
    }


    navigator.geolocation
        .clearWatch(
            gpsWatchId
        );


    gpsWatchId = null;


    userLocationMarker.style.display =
        "none";


    gpsButton.classList.remove(
        "active"
    );


    gpsButton.classList.remove(
        "loading"
    );


    showGpsStatus(
        "現在地表示を停止しました"
    );
}


/* =========================================
   GPSボタン

   押すとON/OFF
========================================= */

gpsButton.addEventListener(
    "click",
    function () {

        if (
            gpsWatchId === null
        ) {

            startGPS();

        }

        else {

            stopGPS();
        }

    }
);


/* =========================================
   ページを開いたら自動でGPS開始
========================================= */

window.addEventListener(
    "load",
    function () {

        startGPS();

    }
);

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
            "時刻表を自動更新中 ※到着は道路状況により前後します";
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
