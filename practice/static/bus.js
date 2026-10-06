/* =========================================
   バス時刻表 自動取得
========================================= */

const BUS_DATA_URL =
    "https://www2.city.kyoto.lg.jp/koho/opendata/gtfs/kyoto_city_bus_gtfs.zip";


/* -----------------------------------------
   バス時刻表を取得
----------------------------------------- */

async function loadBusTimetable() {

    try {

        console.log("バス時刻表を取得しています...");

        const response = await fetch(BUS_DATA_URL);

        if (!response.ok) {
            throw new Error(
                `データ取得失敗: ${response.status}`
            );
        }

        const data = await response.arrayBuffer();

        console.log("バスデータ取得成功");
        console.log(data);

        return data;

    } catch (error) {

        console.error(
            "バス時刻表の取得に失敗しました",
            error
        );

        return null;
    }
}


/* -----------------------------------------
   初期化
----------------------------------------- */

async function initBus() {

    const data = await loadBusTimetable();

    if (!data) {
        console.log("バスデータを読み込めませんでした");
        return;
    }

    console.log("バス機能の初期化完了");
}


/* -----------------------------------------
   実行
----------------------------------------- */

initBus();
