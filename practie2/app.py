# app.py

from flask import Flask, render_template

app = Flask(__name__)

# ブラウザが日本語を誤った文字コードで解釈しないよう、
# HTML / JS / JSON / CSV / CSS のUTF-8を明示する。
@app.after_request
def set_utf8_charset(response):
    utf8_types = {
        "text/html", "text/css", "application/javascript", "text/javascript",
        "application/json", "text/csv", "text/plain"
    }
    if response.mimetype in utf8_types:
        response.headers["Content-Type"] = f"{response.mimetype}; charset=utf-8"
    return response


@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)