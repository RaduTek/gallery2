from dotenv import load_dotenv
import flask
import content, config, thumbnails

load_dotenv()
app = flask.Flask(__name__)


@app.route("/")
def app_main():
    return flask.send_from_directory("", "index.html")


@app.get("/content/<path:path_rel>")
def serve_content(path_rel):
    return flask.send_from_directory(config.CONTENT_DIR, path_rel)


@app.get("/thumb/<path:path_rel>")
def serve_thumb(path_rel):
    try:
        thumb_file = thumbnails.get_thumbnail(path_rel)
        if thumb_file:
            return flask.send_from_directory(thumb_file.parent, thumb_file.name)
    except RuntimeError:
        pass

    return flask.Response("Thumbnail not available", status=404)


@app.get("/preview/<path:path_rel>")
def serve_preview(path_rel):
    preview_file = thumbnails.get_preview_image(path_rel)
    if preview_file:
        return flask.send_from_directory(preview_file.parent, preview_file.name)

    return flask.Response("Preview not available", status=404)


@app.get("/meta/<path:path_rel>")
def serve_meta(path_rel):
    return content.get_item_meta(path_rel)


@app.get("/list")
@app.get("/list/")
@app.get("/list/<path:path_rel>")
def serve_list(path_rel=""):
    return content.get_directory_listing(path_rel)
