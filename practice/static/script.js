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

});

popupOverlay.addEventListener("click", function (e) {

    if (e.target === popupOverlay) {

        popupOverlay.style.display = "none";
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
// 前の写真
//////////////////////////////////////////////////

prevBtn.addEventListener("click", function (e) {

    e.stopPropagation();

    currentIndex--;

    if (currentIndex < 0) {

        currentIndex =
            currentPhotos.length - 1;
    }

    photo.src =
        "/static/" + currentPhotos[currentIndex];

});

//////////////////////////////////////////////////
// 次の写真
//////////////////////////////////////////////////

nextBtn.addEventListener("click", function (e) {

    e.stopPropagation();

    currentIndex++;

    if (currentIndex >= currentPhotos.length) {

        currentIndex = 0;
    }

    photo.src =
        "/static/" + currentPhotos[currentIndex];

});

//////////////////////////////////////////////////
// 写真のスワイプ
//////////////////////////////////////////////////

let startX = 0;

photo.addEventListener("touchstart", function (e) {

    if (currentPhotos.length <= 1) return;

    startX = e.touches[0].clientX;

});

photo.addEventListener("touchend", function (e) {

    if (currentPhotos.length <= 1) return;

    const endX = e.changedTouches[0].clientX;

    // 左にスワイプ → 次の写真
    if (startX - endX > 50) {

        currentIndex++;

        if (currentIndex >= currentPhotos.length) {

            currentIndex = 0;
        }

        photo.src =
            "/static/" + currentPhotos[currentIndex];
    }

    // 右にスワイプ → 前の写真
    else if (endX - startX > 50) {

        currentIndex--;

        if (currentIndex < 0) {

            currentIndex =
                currentPhotos.length - 1;
        }

        photo.src =
            "/static/" + currentPhotos[currentIndex];
    }
});

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
// GPS 現在地機能
//////////////////////////////////////////////////

const GPS_STORAGE_KEY = "campusGpsCalibrationV1";

let gpsWatchId = null;
let latestGpsPosition = null;
let gpsCalibrationPoints = [];


/* ================================
   保存済みの校正データを読み込む
================================ */

try {

    const saved =
        JSON.parse(
            localStorage.getItem(GPS_STORAGE_KEY) || "[]"
        );

    if (Array.isArray(saved)) {
        gpsCalibrationPoints = saved;
    }

} catch (error) {

    console.log(
        "GPS校正データを読み込めませんでした"
    );
}


/* ================================
   現在地マーカー作成
================================ */

const userLocationMarker =
    document.createElement("div");

userLocationMarker.id = "user-location";

userLocationMarker.style.display = "none";

mapContainer.appendChild(
    userLocationMarker
);


/* GPS精度の円 */

const userAccuracyCircle =
    document.createElement("div");

userAccuracyCircle.id = "user-accuracy";

userAccuracyCircle.style.display = "none";

mapContainer.appendChild(
    userAccuracyCircle
);


/* ================================
   GPSボタン作成
================================ */

const gpsButton =
    document.createElement("button");

gpsButton.type = "button";

gpsButton.className = "gps-btn";

gpsButton.textContent = "◎";

gpsButton.title = "現在地";

document.body.appendChild(
    gpsButton
);


/* ================================
   GPS状態表示
================================ */

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

            gpsStatus.style.display =
                "none";

        }, 3500);
}


/* ================================
   3元連立方程式
================================ */

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
                Math.abs(
                    a[row][col]
                )
                >
                Math.abs(
                    a[pivot][col]
                )
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
                "校正点が近すぎます"
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

            if (
                row === col
            ) {

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


/* ================================
   GPS → 地図座標
================================ */

function gpsToMap(lat, lng) {

    if (
        gpsCalibrationPoints.length < 3
    ) {

        return null;
    }


    const points =
        gpsCalibrationPoints.slice(
            0,
            3
        );


    const matrix =
        points.map(
            function (p) {

                return [
                    p.lng,
                    p.lat,
                    1
                ];
            }
        );


    const xValues =
        points.map(
            p => p.x
        );


    const yValues =
        points.map(
            p => p.y
        );


    try {

        const xCoef =
            solve3x3(
                matrix,
                xValues
            );


        const yCoef =
            solve3x3(
                matrix,
                yValues
            );


        const x =

            xCoef[0] * lng +

            xCoef[1] * lat +

            xCoef[2];


        const y =

            yCoef[0] * lng +

            yCoef[1] * lat +

            yCoef[2];


        return {

            x: x,
            y: y
        };


    } catch (error) {

        console.log(
            "GPS変換エラー",
            error
        );

        return null;
    }
}


/* ================================
   現在地更新
================================ */

function updateUserLocation(
    position
) {

    latestGpsPosition =
        position;


    const lat =
        position.coords.latitude;


    const lng =
        position.coords.longitude;


    const accuracy =
        position.coords.accuracy;


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
        accuracy
    );


    /* 校正がまだ */

    if (
        gpsCalibrationPoints.length < 3
    ) {

        userLocationMarker
            .style.display =
            "none";


        showGpsStatus(

            "GPS取得成功・校正 " +

            gpsCalibrationPoints.length +

            "/3"

        );


        return;
    }


    const point =
        gpsToMap(
            lat,
            lng
        );


    if (!point) {

        return;
    }


    /* 地図外判定 */

    const width =
        map.offsetWidth;


    const height =
        map.offsetHeight;


    if (

        point.x < 0 ||

        point.x > width ||

        point.y < 0 ||

        point.y > height

    ) {

        userLocationMarker
            .style.display =
            "none";


        userAccuracyCircle
            .style.display =
            "none";


        showGpsStatus(
            "キャンパス範囲外です"
        );


        return;
    }


    /* 現在地表示 */

    userLocationMarker
        .style.left =
        point.x + "px";


    userLocationMarker
        .style.top =
        point.y + "px";


    userLocationMarker
        .style.display =
        "block";


    gpsButton
        .classList
        .remove(
            "loading"
        );


    gpsButton
        .classList
        .add(
            "active"
        );


    showGpsStatus(

        "現在地更新・精度 約" +

        Math.round(
            accuracy
        ) +

        "m"

    );
}


/* ================================
   GPS開始
================================ */

function startGPS() {

    if (
        !navigator.geolocation
    ) {

        alert(
            "この端末ではGPSを利用できません"
        );

        return;
    }


    if (
        gpsWatchId !== null
    ) {

        return;
    }


    gpsButton
        .classList
        .add(
            "loading"
        );


    showGpsStatus(
        "現在地を取得しています"
    );


    gpsWatchId =

        navigator.geolocation
            .watchPosition(

                updateUserLocation,


                function (error) {

                    gpsButton
                        .classList
                        .remove(
                            "loading"
                        );


                    if (
                        error.code ===
                        error.PERMISSION_DENIED
                    ) {

                        alert(
                            "位置情報を許可してください"
                        );

                    }


                    else if (

                        error.code ===
                        error.POSITION_UNAVAILABLE

                    ) {

                        alert(
                            "現在地を取得できません"
                        );

                    }


                    else if (

                        error.code ===
                        error.TIMEOUT

                    ) {

                        alert(
                            "GPS取得がタイムアウトしました"
                        );

                    }

                },


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


/* ================================
   GPS停止
================================ */

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


    gpsWatchId =
        null;


    gpsButton
        .classList
        .remove(
            "active"
        );


    gpsButton
        .classList
        .remove(
            "loading"
        );


    showGpsStatus(
        "GPSを停止しました"
    );
}


/* ================================
   GPSボタン
================================ */

gpsButton.addEventListener(
    "click",
    function () {

        if (
            gpsWatchId === null
        ) {

            startGPS();

        } else {

            stopGPS();
        }
    }
);


/* ================================
   GPS校正モード
================================ */

/*

URLの最後に

?gpscal=1

を付ける。

例

https://○○.onrender.com/?gpscal=1

*/


const gpsParams =
    new URLSearchParams(
        window.location.search
    );


const gpsCalibrationMode =

    gpsParams.get(
        "gpscal"
    ) === "1";


if (
    gpsCalibrationMode
) {


    /* 校正表示 */

    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "gps-calibration-panel";


    const text =
        document.createElement(
            "span"
        );


    const resetButton =
        document.createElement(
            "button"
        );


    resetButton.textContent =
        "リセット";


    panel.appendChild(
        text
    );


    panel.appendChild(
        resetButton
    );


    document.body.appendChild(
        panel
    );


    function updatePanel() {

        text.textContent =

            "GPS校正：" +

            gpsCalibrationPoints.length +

            "/3 点";
    }


    updatePanel();


    /* GPS自動開始 */

    startGPS();


    /* 地図を押して地点登録 */

    map.addEventListener(
        "click",
        function (event) {


            if (
                !latestGpsPosition
            ) {

                alert(
                    "GPS取得中です。少ししてからもう一度押してください"
                );

                return;
            }


            if (
                gpsCalibrationPoints.length >= 3
            ) {

                alert(
                    "3地点登録済みです"
                );

                return;
            }


            const rect =
                map.getBoundingClientRect();


            /*
            スマホで地図が縮小されていても
            1080px基準座標に戻す
            */

            const x =

                (
                    event.clientX -
                    rect.left
                )

                *

                (
                    map.offsetWidth /
                    rect.width
                );


            const y =

                (
                    event.clientY -
                    rect.top
                )

                *

                (
                    map.offsetHeight /
                    rect.height
                );


            const lat =

                latestGpsPosition
                    .coords
                    .latitude;


            const lng =

                latestGpsPosition
                    .coords
                    .longitude;


            const accuracy =

                latestGpsPosition
                    .coords
                    .accuracy;


            const number =

                gpsCalibrationPoints
                    .length + 1;


            const result =
                confirm(

                    "地点" +

                    number +

                    "を登録しますか？\n\n" +

                    "X：" +

                    Math.round(x) +

                    "\nY：" +

                    Math.round(y) +

                    "\nGPS精度：約" +

                    Math.round(
                        accuracy
                    ) +

                    "m"

                );


            if (
                !result
            ) {

                return;
            }


            gpsCalibrationPoints.push({

                lat: lat,

                lng: lng,

                x: Math.round(x),

                y: Math.round(y)

            });


            localStorage.setItem(

                GPS_STORAGE_KEY,

                JSON.stringify(
                    gpsCalibrationPoints
                )

            );


            updatePanel();


            if (
                gpsCalibrationPoints.length === 3
            ) {

                alert(
                    "GPS校正完了！\n通常のURLで開いて現在地ボタンを押してください。"
                );


                updateUserLocation(
                    latestGpsPosition
                );
            }

        }
    );


    /* 校正リセット */

    resetButton.addEventListener(
        "click",
        function () {


            const result =
                confirm(
                    "GPS校正をリセットしますか？"
                );


            if (!result) {

                return;
            }


            gpsCalibrationPoints = [];


            localStorage.removeItem(
                GPS_STORAGE_KEY
            );


            userLocationMarker
                .style.display =
                "none";


            userAccuracyCircle
                .style.display =
                "none";


            updatePanel();


            alert(
                "校正データを削除しました"
            );

        }
    );

}
