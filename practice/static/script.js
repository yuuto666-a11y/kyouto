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
// 椥辻・山科・京都駅・大宅中学校
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

const busFromUniversity =
    document.getElementById("busFromUniversity");

const busToUniversity =
    document.getElementById("busToUniversity");


let busCountdownTimer = null;


/*
=========================================
現在選択中

route:
nagitsuji
yamashina
kyoto
oyake

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
山科だけ発着地点を切替
university = 京都橘大学発着
oyake      = 大宅発着
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

            weekday: [
                "06:50",
                "07:38",
                "17:25",
                "17:55",
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
    // 大宅中学校（京都橘大学下） ↔ 京都駅八条口
    // 大学構内に入らない通常便を表示
    //////////////////////////////////////////////////

    oyake: {

        name:"京都駅八条口",

        fromUniversity: {

            // 大宅中学校（京都橘大学下） → 京都駅八条口
            weekday: [
                "06:28","06:55",
                "07:04","07:30",
                "08:01","08:43",
                "09:13","09:40",
                "10:13","10:43",
                "11:43",
                "12:13","12:43",
                "13:43",
                "14:13","14:43",
                "15:43",
                "16:13","16:43",
                "17:46",
                "18:18",
                "20:32"
            ],

            saturday: [
                "06:38",
                "07:18","07:59",
                "08:20","08:46",
                "09:21","09:43",
                "10:13","10:48",
                "11:13","11:43",
                "12:43",
                "13:43",
                "14:13","14:43",
                "15:13","15:43",
                "16:13","16:43",
                "17:13","17:43",
                "18:13","18:45",
                "19:43",
                "20:13",
                "21:01"
            ],

            sunday: [
                "06:38",
                "07:18","07:59",
                "08:20","08:46",
                "09:21","09:43",
                "10:13","10:48",
                "11:13","11:43",
                "12:43",
                "13:43",
                "14:13","14:43",
                "15:13","15:43",
                "16:13","16:43",
                "17:13","17:43",
                "18:13","18:45",
                "19:43",
                "20:13",
                "21:01"
            ]
        },

        toUniversity: {

            // 京都駅八条口 → 大宅中学校（京都橘大学下）
            weekday: [
                "07:07","07:50",
                "08:46",
                "09:21","09:53",
                "10:51",
                "11:21","11:48",
                "12:51",
                "13:21","13:48",
                "14:51",
                "15:21","15:51",
                "16:51",
                "17:21","17:51",
                "18:24","18:56",
                "19:40",
                "20:29",
                "21:09","21:54"
            ],

            saturday: [
                "07:12","07:52",
                "08:32","08:54",
                "09:24","09:59",
                "10:21","10:51",
                "11:26","11:51",
                "12:21",
                "13:21",
                "14:21","14:51",
                "15:21","15:51",
                "16:21","16:51",
                "17:21","17:51",
                "18:21","18:51",
                "19:22",
                "20:15","20:45",
                "21:33"
            ],

            sunday: [
                "07:12","07:52",
                "08:33","08:54",
                "09:24","09:59",
                "10:21","10:51",
                "11:26","11:51",
                "12:21",
                "13:21",
                "14:21","14:51",
                "15:21","15:51",
                "16:21","16:51",
                "17:21","17:51",
                "18:21","18:51",
                "19:22",
                "20:15","20:45",
                "21:33"
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
// 京都駅便の自動フォールバック
//////////////////////////////////////////////////

function getEffectiveBusRouteKey(date = new Date()) {

    const dayType =
        getBusDayType(date);

    /*
    山科で「大宅発着」を選んだ場合
    */

    if (
        selectedBusRoute === "yamashina" &&
        selectedBusStopMode === "oyake"
    ) {
        return "yamashinaOyake";
    }

    /*
    京都駅便は、
    土日祝の場合、
    大宅中学校（京都橘大学下）発着へ自動切替
    */

    if (
        selectedBusRoute === "kyoto" &&
        (
            dayType === "saturday" ||
            dayType === "sunday"
        )
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


function ensureBusStopModeUI() {

    const routeButtons =
        document.querySelector(".bus-route-buttons");

    const directionButtons =
        document.querySelector(".bus-direction-buttons");

    if (!routeButtons || !directionButtons) {
        return;
    }

    /*
    既存4ボタンはそのまま残し、
    表示名だけ整理
    */

    const labels = {
        nagitsuji:"椥辻",
        yamashina:"山科",
        kyoto:"京都駅",
        oyake:"大宅発着"
    };

    routeButtons
        .querySelectorAll(".bus-route-btn")
        .forEach(function (button) {

            const label =
                labels[button.dataset.route];

            if (label) {
                button.textContent = label;
            }
        });

    let stopModeBox =
        document.getElementById("bus-stop-mode-buttons");

    if (!stopModeBox) {

        stopModeBox =
            document.createElement("div");

        stopModeBox.id =
            "bus-stop-mode-buttons";

        stopModeBox.className =
            "bus-stop-mode-buttons";

        stopModeBox.innerHTML = `
            <button
                type="button"
                class="bus-stop-mode-btn active"
                data-stop-mode="university">
                大学発着
            </button>

            <button
                type="button"
                class="bus-stop-mode-btn"
                data-stop-mode="oyake">
                大宅発着
            </button>
        `;

        directionButtons.parentNode.insertBefore(
            stopModeBox,
            directionButtons
        );

        stopModeBox
            .querySelectorAll(".bus-stop-mode-btn")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        if (
                            this.dataset.stopMode === "oyake" &&
                            selectedBusRoute !== "yamashina"
                        ) {
                            return;
                        }

                        selectedBusStopMode =
                            this.dataset.stopMode;

                        updateBusCountdown();
                    }
                );
            });
    }

    updateBusStopModeUI();
}


function updateBusStopModeUI() {

    const stopModeBox =
        document.getElementById("bus-stop-mode-buttons");

    if (!stopModeBox) {
        return;
    }

    const universityButton =
        stopModeBox.querySelector(
            '[data-stop-mode="university"]'
        );

    const oyakeButton =
        stopModeBox.querySelector(
            '[data-stop-mode="oyake"]'
        );

    /*
    山科だけ2択。
    椥辻・京都駅は大学発着のみ。
    独立した「大宅発着」タブではこの段を隠す。
    */

    if (selectedBusRoute === "oyake") {

        stopModeBox.hidden = true;
        return;
    }

    stopModeBox.hidden = false;

    if (selectedBusRoute === "yamashina") {

        oyakeButton.hidden = false;

    } else {

        selectedBusStopMode =
            "university";

        oyakeButton.hidden = true;
    }

    universityButton.classList.toggle(
        "active",
        selectedBusStopMode === "university"
    );

    oyakeButton.classList.toggle(
        "active",
        selectedBusStopMode === "oyake"
    );
}


function updateBusDirectionLabels() {

    const effectiveRouteKey =
        getEffectiveBusRouteKey();

    if (
        effectiveRouteKey === "oyake" ||
        effectiveRouteKey === "yamashinaOyake"
    ) {

        busFromUniversity.textContent =
            "大宅発";

        busToUniversity.textContent =
            "大宅行き";

    } else {

        busFromUniversity.textContent =
            "大学発";

        busToUniversity.textContent =
            "大学行き";
    }
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
        getEffectiveBusRouteKey(now);

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
// 次のバス
//////////////////////////////////////////////////

function getNextBus() {

    const timetable =
        getTodayBusTimetable();

    if (
        !timetable ||
        timetable.length === 0
    ) {
        return null;
    }

    const now =
        new Date();

    for (const time of timetable) {

        const [hour, minute] =
            time.split(":").map(Number);

        const departure =
            new Date(now);

        departure.setHours(
            hour,
            minute,
            0,
            0
        );

        if (departure > now) {

            return {
                time: time,
                date: departure
            };
        }
    }

    return null;
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
            "大宅中学校（京都橘大学下）";

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
        getEffectiveBusRouteKey(now);

    syncBusRouteButtons();
    updateBusStopModeUI();
    updateBusDirectionLabels();
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

        return;
    }

    const nextBus =
        getNextBus();

    if (!nextBus) {

        nextBusTime.textContent =
            "--:--";

        busCountdown.textContent =
            "本日の運行は終了しました";

        busStatus.textContent =
            "";

        return;
    }

    nextBusTime.textContent =
        nextBus.time;

    busCountdown.textContent =
        "発車まで " +
        getCountdownText(nextBus.date);

    if (
        selectedBusRoute === "kyoto" &&
        effectiveRouteKey === "oyake"
    ) {

        busStatus.textContent =
            "土日祝は大学発着便がないため大宅中学校発着を表示中";

    } else if (
        selectedBusRoute === "kyoto" &&
        isUniversityRecess(now)
    ) {

        busStatus.textContent =
            "学休期です。大宅タブの通常便も利用できます";

    } else if (effectiveRouteKey === "yamashinaOyake") {

        busStatus.textContent =
            "山科駅 ↔ 大宅の大宅発着便を表示中";

    } else if (effectiveRouteKey === "oyake") {

        busStatus.textContent =
            "大宅中学校（京都橘大学下）発着を表示中";

    } else {

        busStatus.textContent =
            "時刻表を自動更新中";
    }
}


//////////////////////////////////////////////////
// 路線切替
//////////////////////////////////////////////////

document
    .querySelectorAll(".bus-route-btn")
    .forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                selectedBusRoute =
                    this.dataset.route;

                if (
                    selectedBusRoute !== "yamashina"
                ) {
                    selectedBusStopMode =
                        "university";
                }

                syncBusRouteButtons();
                updateBusStopModeUI();
                updateBusCountdown();
            }
        );
    });


//////////////////////////////////////////////////
// 大学 / 大宅 発
//////////////////////////////////////////////////

busFromUniversity.addEventListener(
    "click",
    function () {

        selectedBusDirection =
            "fromUniversity";

        busFromUniversity
            .classList.add("active");

        busToUniversity
            .classList.remove("active");

        updateBusCountdown();
    }
);


//////////////////////////////////////////////////
// 大学 / 大宅 行き
//////////////////////////////////////////////////

busToUniversity.addEventListener(
    "click",
    function () {

        selectedBusDirection =
            "toUniversity";

        busToUniversity
            .classList.add("active");

        busFromUniversity
            .classList.remove("active");

        updateBusCountdown();
    }
);


//////////////////////////////////////////////////
// 初回表示時の学休期おすすめ
//////////////////////////////////////////////////

let busOpenedOnce = false;


//////////////////////////////////////////////////
// バスポップアップ開始
//////////////////////////////////////////////////

function startBusInformation() {

    clearInterval(busCountdownTimer);

    /*
    学休期に初めてバスを開いた場合は
    大宅中学校を最初に表示
    */

    if (
        !busOpenedOnce &&
        isUniversityRecess(new Date())
    ) {
        selectedBusRoute = "oyake";
    }

    busOpenedOnce = true;

    busLiveInfo.hidden = false;

    ensureBusStopModeUI();
    syncBusRouteButtons();
    updateBusStopModeUI();
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
