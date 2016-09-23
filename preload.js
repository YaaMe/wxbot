// var ipc = require('ipc')
var clipboard = require('electron').clipboard
var nativeImage = require('electron').nativeImage
var win = require('electron').remote.getCurrentWindow()
const {width, height} = require('electron').screen.getPrimaryDisplay().workAreaSize
var _ = require('lodash')

const ROOM = '欢迎莅临姚远和霍丽婕的婚礼';
const CUSTOM_CSS = `
    @keyframes fly {
        0%     {transform: translateX(100vw);}
        100%   {transform: translateX(-100vw);}
    }
    .danmu { 
        position: fixed;
        z-index: 9999;
        top:0;
        left:0;
    	background-color: transparent;
        width: 100vw; 
        height: 100vh; 
    }
    .danmu .word {
        color: white; 
        text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;
        transform: translateX(100vw);
        animation-name: fly;
        animation-duration: 10s;
        animation-timing-function: linear;
        animation-iteration-count: 1;
        animation-direction: alternate;
        animation-play-state: running;
        font-size: 1.5rem;
        line-height: 1.5rem;
        height: 1.5rem;
    }
    .danmu .manager {
        color: yellow;
        text-shadow: -1px 0 red, 0 1px red, 1px 0 red, 0 -1px red;
        transform: translateX(100vw);
        animation-name: fly;
        animation-duration: 20s;
        animation-timing-function: linear;
        animation-iteration-count: 1;
        animation-direction: alternate;
        animation-play-state: running;
        font-size: 2rem;
        line-height: 2rem;
        height: 2rem;
 
    }
    .danmu .admin {
        color: red;
        font-family: SimHei;
        text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;
        transform: translateX(100vw);
        animation-name: fly;
        animation-duration: 20s;
        animation-timing-function: linear;
        animation-iteration-count: 1;
        animation-direction: alternate;
        animation-play-state: running;
        font-size: 3rem;
        line-height: 3rem;
        height: 3rem;
 
    }
`
const DANMU = "<div class='danmu'></div>"


// 应对 微信网页偷换了console 使起失效
// 保住console引用 便于使用
window._console = window.console

function debug(/*args*/){
	var args = JSON.stringify(_.toArray(arguments))
	_console.log(args)
}

// 禁止外层网页滚动 影响使用
document.addEventListener('DOMContentLoaded', () => {
	document.body.style.overflow = 'hidden'
    win.setSize(width - 1, height - 1)
    // Mute Audio
    win.webContents.setAudioMuted(true)
    win.webContents.insertCSS(CUSTOM_CSS)
    // Disable Native Notification
    window.Notification = null
})

var free = true
init()

function addAmo(amu, group=0) {
    let danmu = document.querySelector('.danmu');
    let _div = document.createElement('div');
    _div.innerHTML = amu;
    switch(group) {
        case 0: _div.classList.add('word');break;
        case 1: _div.classList.add('manager');break;
        case 2: _div.classList.add('admin');break;
        default: _div.classList.add('word');break;
    }
    danmu.appendChild(_div);
    setTimeout(function(){ _div.remove() }, 10000)
}

function init(){
	var checkForQrcode = setInterval(function(){
		 var qrimg = document.querySelector('.qrcode img')
		if (qrimg && qrimg.src.match(/\/qrcode/)) {
			debug('二维码', qrimg.src)
			clearInterval(checkForQrcode)
		}
	}, 100)
	var checkForLogin = setInterval(function(){
		var chat_item = document.querySelector('.chat_item')
		if (chat_item) {
			onLogin()
			clearInterval(checkForLogin)
		}
	}, 500)
}

var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function(obj, callback){
        if( MutationObserver ){
            // define a new observer
            var obs = new MutationObserver(function(mutations, observer){
                if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                    callback();
            });
            // have the observer observe foo for changes in children
            obs.observe( obj, { childList:true, subtree:true });
        }
        else if( eventListenerSupported ){
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    }
})();


function onLogin(){

	$('img[src*=filehelper]').closest('.chat_item')[0].click()
    $('body').css('background','transparent')
    $('.loaded .main').css('opacity', 0)
    $('body').append(DANMU)

	var checkForReddot = setInterval(function(){
		// window.isFocus = true
		var $reddot = $('.web_wechat_reddot, .web_wechat_reddot_middle').last()
		if ($reddot.length) {
			var $chat_item = $reddot.closest('.chat_item')
			try {
				onReddot($chat_item)
			} catch (err) { // 错误解锁
				reset()
			}
		}
	}, 100)

}

function onReddot($chat_item){
	if (!free) return
	free = false
	$chat_item[0].click()

	setTimeout(function(){
	var reply = {}

	// 自动回复 相同的内容
	var $msg = $([
		'.message:not(.me) .bubble_cont > div',
		'.message:not(.me) .bubble_cont > a.app',
		'.message:not(.me) .emoticon',
		'.message_system'
	].join(', ')).last()
	var $message = $msg.closest('.message')
	var $nickname = $message.find('.nickname')
	var $titlename = $('.title_name')

	if ($nickname.length) { // 群聊
		var from = $nickname.text()
		var room = $titlename.text()
	} else { // 单聊
		var from = $titlename.text()
		var room = null
	}
//	debug('来自', from, room) // 这里的nickname会被remark覆盖

	// 系统消息暂时无法捕获
	// 因为不产生红点 而目前我们依靠红点 可以改善
//	if ($msg.is('.message_system')) {
//		var ctn = $msg.find('.content').text()
//		if (ctn === '收到红包，请在手机上查看') {
//			text = '发毛红包'
//		} else if (ctn === '位置共享已经结束') {
//			text = '位置共享已经结束'
//		} else if (ctn === '实时对讲已经结束') {
//			text = '实时对讲已经结束'
//		} else if (ctn.match(/(.+)邀请(.+)加入了群聊/)) {
//			text = '加毛人'
//		} else if (ctn.match(/(.+)撤回了一条消息/)) {
//			text = '撤你妹'
//		} else {
//			// 无视
//		}
//	} else
//
//	if ($msg.is('.emoticon')) { // 自定义表情
//		var src = $msg.find('.msg-img').prop('src')
//		debug('接收', 'emoticon', src)
//		reply.text = '发毛表情'
//	} else if ($msg.is('.picture')) {
//		var src = $msg.find('.msg-img').prop('src')
//		debug('接收', 'picture', src)
//		// reply.text = '发毛图片'
//		reply.image = './fuck.jpeg'
//	} else if ($msg.is('.location')) {
//		//var src = $msg.find('.img').prop('src')
//		var desc = $msg.find('.desc').text()
//		debug('接收', 'location', desc)
//		reply.text = desc
//	} else if ($msg.is('.attach')) {
//		var title = $msg.find('.title').text()
//		var size = $msg.find('span:first').text()
//		var $download = $msg.find('a[download]') // 可触发下载
//		debug('接收', 'attach', title, size)
//		reply.text = title + '\n' + size
//	} else if ($msg.is('.microvideo')) {
//		var poster = $msg.find('img').prop('src') // 限制
//		var src = $msg.find('video').prop('src') // 限制
//		debug('接收', 'microvideo', src)
//		reply.text = '发毛小视频'
//	} else if ($msg.is('.video')) {
//		var poster = $msg.find('.msg-img').prop('src') // 限制
//		debug('接收', 'video', src)
//		reply.text = '发毛视频'
//	} else if ($msg.is('.voice')) {
//		$msg[0].click()
//		var duration = parseInt($msg.find('.duration').text())
//		var src = $('#jp_audio_1').prop('src') // 认证限制
//		var msgid = src.match(/msgid=(\d+)/)[1]
//		var date = new Date().toJSON()
//			.replace(/\..+/, '')
//			.replace(/[\-:]/g, '')
//			.replace('T', '-')
//		// 20150927-164539_5656119287354277662.mp3
//		var filename = `${date}_${msgid}.mp3`
//		$('<a>').attr({
//			download: filename,
//			href: src
//		})[0].click() // 触发下载
//		debug('接收', 'voice', `${duration}s`, src)
//		reply.text = '发毛语音'
//	} else if ($msg.is('.card')) {
//		var name = $msg.find('.display_name').text()
//		var wxid = $msg.find('.signature').text()
//		var img = $msg.find('.img').prop('src') // 认证限制
//		debug('接收', 'card', name, wxid)
//		reply.text = name + '\n' + wxid
//	} else if ($msg.is('a.app')) {
//		var url = $msg.attr('href')
//		url = decodeURIComponent(url.match(/requrl=(.+?)&/)[1])
//		var title = $msg.find('.title').text()
//		var desc = $msg.find('.desc').text()
//		var img = $msg.find('.cover').prop('src') // 认证限制
//		debug('接收', 'link', title, desc, url)
//		reply.text = title + '\n' + url
//	} else if ($msg.is('.plain')) {
	if ($msg.is('.plain') && room === ROOM) {
		var text = ''
		var normal = false
		var $text = $msg.find('.js_message_plain')
		$text.contents().each(function(i, node){
			if (node.nodeType === Node.TEXT_NODE) {
				text += node.nodeValue
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				var $el = $(node)
				if ($el.is('br')) text += '\n'
				else if ($el.is('.qqemoji, .emoji')) {
					text += $el.attr('text').replace(/_web$/, '')
				}
			}
		})
		if (text === '[收到了一个表情，请在手机上查看]' ||
				text === '[Received a sticker. View on phone]') { // 微信表情包
			text = '发毛表情'
		} else if (text === '[收到一条微信转账消息，请在手机上查看]' ||
				text === '[Received transfer. View on phone.]') {
			text = '转毛帐'
		} else if (text === '[收到一条视频/语音聊天消息，请在手机上查看]' ||
				text === '[Received video/voice chat message. View on phone.]') {
			text = '聊jj'
		} else if (text === '我发起了实时对讲') {
			text = '对讲你妹'
		} else if (text === '该类型暂不支持，请在手机上查看') {
			text = ''
		} else if (text.match(/(.+)发起了位置共享，请在手机上查看/) ||
				text.match(/(.+)started a real\-time location session\. View on phone/)) {
			text = '发毛位置共享'
		} else {
			normal = true
		}
		if (normal && !text.match(/叼|屌|diao|丢你|碉堡/i)) {
	        debug('来自', from, room) // 这里的nickname会被remark覆盖
		    debug('接收', 'text', text)
            if(text.match(/0/)) {
                addAmo(text, 0)
            } else {
                if (text.match(/1/)) {
                    addAmo(text, 1)
                } else {
                    if (text.match(/2/)) {
                        addAmo(text, 2)
                    } else {
                        addAmo(text,0)
                    }
                }
            }
        }
		// reply.text = text
	}
	//debug('回复', reply)

	// 借用clipboard 实现输入文字 更新ng-model=EditAreaCtn
	// ~~直接设#editArea的innerText无效 暂时找不到其他方法~~
	// paste(reply)

	// 发送text 可以直接更新scope中的变量 @昌爷 提点
	// 但不知为毛 发不了表情
	// if (reply.image) {
	// 	paste(reply)
	// } else {
	// 	angular.element('#editArea').scope().editAreaCtn = reply.text
	// }


	// $('.web_wechat_face')[0].click()
	// $('[title=阴险]')[0].click()

	// if (reply.image) {
	// 	setTimeout(function(){
	// 		var tryClickBtn = setInterval(function(){
	// 			var $btn = $('.dialog_ft .btn_primary')
	// 			if ($btn.length) {
	// 				$('.dialog_ft .btn_primary')[0].click()
	// 			} else {
	// 				clearInterval(tryClickBtn)
	// 				reset()
	// 			}
	// 		}, 200)
	// 	}, 100)
	// } else {
	// 	$('.btn_send')[0].click()
	// 	reset()
	// }

	reset()



	}, 100)
}

function reset(){
	// 适当清理历史 缓解dom数量
	var msgs = $('#chatArea').scope().chatContent
	if (msgs.length >= 30) msgs.splice(0, 20)
	$('img[src*=filehelper]').closest('.chat_item')[0].click()
	free = true
}

function paste(opt){
	var oldImage = clipboard.readImage()
	var oldHtml = clipboard.readHtml()
	var oldText = clipboard.readText()
	clipboard.clear() // 必须清空
	if (opt.image) {
		// 不知为啥 linux上 clipboard+nativeimage无效
		try {
			clipboard.writeImage(nativeImage.createFromPath(opt.image))
		} catch (err) {
			opt.image = null
			opt.text = '妈蛋 发不出图片'
		}
	}
	if (opt.html) clipboard.writeHtml(opt.html)
	if (opt.text) clipboard.writeText(opt.text)
	$('#editArea')[0].focus()
	document.execCommand('paste')
	clipboard.writeImage(oldImage)
	clipboard.writeHtml(oldHtml)
	clipboard.writeText(oldText)
}
