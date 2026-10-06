/* =====================================================
   京都橘大学 バス時刻表
   -----------------------------------------------------
   4区間 × 往復 = 8方向

   ① 椥辻 ↔ 京都橘大学
   ② 山科駅 ↔ 京都橘大学
   ③ 山科駅 ↔ 大宅
   ④ 京都駅 ↔ 京都橘大学
===================================================== */


/* =====================================================
   路線設定
===================================================== */

const BUS_ROUTES = {

    /* -----------------------------------------
       ① 椥辻 ↔ 京都橘大学
    ----------------------------------------- */

    tsukiji_to_tachibana: {
        from: "椥辻",
        to: "京都橘大学"
    },

    tachibana_to_tsukiji: {
        from: "京都橘大学",
        to: "椥辻"
    },


    /* -----------------------------------------
       ② 山科駅 ↔ 京都橘大学
    ----------------------------------------- */

    yamashina_to_tachibana: {
        from: "山科駅",
        to: "京都橘大学"
    },

    tachibana_to_yamashina: {
        from: "京都橘大学",
        to: "山科駅"
    },


    /* -----------------------------------------
       ③ 山科駅 ↔ 大宅
    ----------------------------------------- */

    yamashina_to_oyake: {
        from: "山科駅",
        to: "大宅"
    },

    oyake_to_yamashina: {
        from: "大宅",
        to: "山科駅"
    },


    /* -----------------------------------------
       ④ 京都駅 ↔ 京都橘大学
    ----------------------------------------- */

    kyoto_to_tachibana: {
        from: "京都駅",
        to: "京都橘大学"
    },

    tachibana_to_kyoto: {
        from: "京都橘大学",
        to: "京都駅"
    }

};


/* =====================================================
   バスデータ取得
===================================================== */

async function getBusData() {

    try {

        /*
         * ここに実際のGTFS/APIのURLを設定する
         */

        const url = null;


        if (!url) {

            console.warn(
                "バスデータの取得先が設定されていません。"
            );

            return null;
        }


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `HTTPエラー: ${response.status}`
            );

        }


        const data =
            await response.arrayBuffer();


        console.log(
            "バスデータ取得成功"
        );


        return data;


    } catch (error) {

        console.error(
            "バスデータ取得エラー:",
            error
        );

        return null;

    }

}


/* =====================================================
   現在時刻を「分」に変換
===================================================== */

function getCurrentMinutes() {

    const now = new Date();

    return (
        now.getHours() * 60 +
        now.getMinutes()
    );

}


/* =====================================================
   時刻を「分」に変換
===================================================== */

function timeToMinutes(time) {

    const parts =
        time.split(":");


    const hour =
        Number(parts[0]);


    const minute =
        Number(parts[1]);


    return (
        hour * 60 +
        minute
    );

}


/* =====================================================
   現在時刻以降のバスだけ取得
===================================================== */

function getUpcomingBuses(times) {

    const currentMinutes =
        getCurrentMinutes();


    return times.filter(time => {

        return (
            timeToMinutes(time)
            >= currentMinutes
        );

    });

}


/* =====================================================
   次のバスを取得
===================================================== */

function getNextBus(times) {

    const upcoming =
        getUpcomingBuses(times);


    if (upcoming.length === 0) {

        return null;

    }


    return upcoming[0];

}


/* =====================================================
   次のバスまで何分か
===================================================== */

function getMinutesUntil(time) {

    const currentMinutes =
        getCurrentMinutes();


    const busMinutes =
        timeToMinutes(time);


    let difference =
        busMinutes - currentMinutes;


    /*
     * 日付をまたぐ場合
     */

    if (difference < 0) {

        difference += 24 * 60;

    }


    return difference;

}


/* =====================================================
   時刻表を表示
===================================================== */

function showBusTimetable(
    routeId,
    times
) {

    const container =
        document.getElementById(
            "bus-timetable"
        );


    if (!container) {

        console.error(
            "bus-timetable が見つかりません。"
        );

        return;

    }


    const route =
        BUS_ROUTES[routeId];


    if (!route) {

        console.error(
            "指定された路線がありません。"
        );

        return;

    }


    /*
     * 一度表示を消す
     */

    container.innerHTML = "";


    /* -----------------------------------------
       タイトル
    ----------------------------------------- */

    const title =
        document.createElement("h3");


    title.textContent =
        `🚍 ${route.from} → ${route.to}`;


    container.appendChild(title);


    /* -----------------------------------------
       次のバス
    ----------------------------------------- */

    const nextBus =
        getNextBus(times);


    if (nextBus) {

        const next =
            document.createElement("div");


        next.className =
            "bus-next";


        next.innerHTML = `
            <strong>次のバス</strong><br>
            ${nextBus}
            <span>
                あと${getMinutesUntil(nextBus)}分
            </span>
        `;


        container.appendChild(next);

    } else {

        const none =
            document.createElement("p");


        none.textContent =
            "本日の運行は終了しました。";


        container.appendChild(none);

    }


    /* -----------------------------------------
       時刻表
    ----------------------------------------- */

    const list =
        document.createElement("div");


    list.className =
        "bus-list";


    times.forEach(time => {

        const item =
            document.createElement("div");


        item.className =
            "bus-time";


        item.textContent =
            time;


        list.appendChild(item);

    });


    container.appendChild(list);

}


/* =====================================================
   路線を表示
===================================================== */

function showBusRoute(routeId) {

    const route =
        BUS_ROUTES[routeId];


    if (!route) {

        console.error(
            "路線が見つかりません。"
        );

        return;

    }


    console.log(
        `${route.from} → ${route.to}`
    );


    /*
     * 現在は動作確認用の仮データ
     *
     * 後でGTFSから自動取得した
     * 本物の時刻に置き換える
     */

    const testTimes = [
        "16:10",
        "16:35",
        "17:00",
        "17:25",
        "17:50",
        "18:15"
    ];


    showBusTimetable(
        routeId,
        testTimes
    );

}


/* =====================================================
   全路線のボタンを表示
===================================================== */

function showAllBusRoutes() {

    const container =
        document.getElementById(
            "bus-route-list"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    Object.entries(BUS_ROUTES)
        .forEach(([id, route]) => {


            const button =
                document.createElement("button");


            button.textContent =
                `${route.from} → ${route.to}`;


            button.className =
                "bus-route-button";


            button.addEventListener(
                "click",
                () => {

                    showBusRoute(id);

                }
            );


            container.appendChild(button);

        });

}


/* =====================================================
   バス機能を初期化
===================================================== */

async function initBus() {

    console.log(
        "🚍 バス時刻表を起動"
    );


    /*
     * バスデータを取得
     */

    const data =
        await getBusData();


    if (data) {

        console.log(
            "バスデータ解析開始"
        );


        /*
         * ここでGTFSを解析する
         */

    }


    /*
     * 8方向の路線を表示
     */

    showAllBusRoutes();

}


/* =====================================================
   起動
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initBus();

    }
);
