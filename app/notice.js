//实现通知功能
var msg_flag = undefined;

function notice (title = "通知", content = "通知内容", icon = "fad fa-flag-checkered") {
  $MsgNotice = $("#info-msg");
  $MsgNotice_icon = $("#info-msg .info-msg-icon").attr("class", "info-msg-icon " + icon);
  $MsgNotice_title = $("#info-msg .info-msg-title").html(title);
  $MsgNotice_content = $("#info-msg .info-msg-content").html(content);

  $MsgNotice.show(200);
  if (msg_flag === undefined) { } else {
    msg_flag = undefined;
    clearTimeout(msg_flag);
  }
  msg_flag = setTimeout(() => {
    $MsgNotice.hide(200);
  }, 3000);
}