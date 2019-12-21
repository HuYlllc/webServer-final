const express = require("express");
const router = express.Router();
const User = require('../models/User');
const Content = require('../models/Content');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const transport = nodemailer.createTransport(smtpTransport({
    host: 'smtp.163.com', 
    port: 25,
    auth: {
        user: 'hznulin@163.com',
        pass: 'linyiduo123123'
    }
}));


let captchaGenerated = "";

var responseDate

router.use((req, res, next) => {
  responseDate = {
    code: "000",
    message: ""
  }
  next()
})

// 邮箱验证
router.post("/user/captcha", (req, res, next) => {
  let email = req.body.email
  captchaGenerated = (1000 + Math.round(Math.random() * 10000 - 1000));

  if (/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/.test(email)) {
    transport.sendMail({
      from: 'hznulin@163.com',
      to: email,
      subject: 'Blog captcha',
      html: '<p>' + captchaGenerated + '</p>'
    }, function (error, data) {
        if (error) {
            console.error(error);
        } else {
            console.log('邮件发送成功');
        }
        transport.close();
    });
    console.log('发送的验证码：' + captchaGenerated);
    res.send(captchaGenerated);
  } else {
    res.send('邮箱格式错误!');
  }
});

// 用户注册
router.post("/user/register", (req, res, next) => {
  let username = req.body.username
  let password = req.body.password
  let repassword = req.body.repassword
  let captcha = req.body.captcha
  let email = req.body.email

  console.log(email);

  if (username == '' || password == '') {
    responseDate = {
      code: '001',
      message: '姓名或者密码不能为空'
    }
    res.json(responseDate)
    return
  }
  if (password != repassword) {
    responseDate = {
      code: '002',
      message: '两次密码不一致'
    }
    res.json(responseDate)
    return
  }
  console.log("输入的验证码：", captcha);
  console.log("生成的验证码：", captchaGenerated);
  if (captcha != captchaGenerated) {
    responseDate = {
      code: '005',
      message: '验证码错误'
    }
    res.json(responseDate)
    return
  }
  // 查询数据库是否重名
  User.findOne({
    username: username
  }).then((userInfo) => {
    if (userInfo) {
      console.log(userInfo)
      responseDate = {
        code: '004',
        message: '用户名已经被注册'
      }
      res.json(responseDate)
      return
    }
    var user = new User({
      username: username,
      password: password,
      email: email
    })
    return user.save()
  }).then((newUserInfo) => {
    responseDate.message = "注册成功";
    res.json(responseDate);
  })
});


// 用户登录
router.post("/user/login", (req, res, next) => {
  let username = req.body.username
  let password = req.body.password

  if (username == '' || password == '') {
    responseDate = {
      code: '001',
      message: '姓名或密码不能为空'
    }
    res.json(responseDate)
    return
  }
  // 查询数据库是否重名
  User.findOne({
    username: username,
    password: password,
  }).then((userInfo) => {
    if (!userInfo) {
       responseDate = {
        code: '004',
        message: '用户不存在'
      }
      res.json(responseDate)
      return
    }
    // 用户名和密码正确
    responseDate = {
      code: '010',
      message: '登录成功',
      userInfo: {
        _id: userInfo._id,
        username: userInfo.username,
        email: userInfo.email
      }
    }
    req.cookies.set('userInfo', JSON.stringify({
      _id: userInfo._id,
      username: userInfo.username,
      email: userInfo.email
    }))
    res.json(responseDate)
    return
  })
});

// 用户退出
router.get('/user/logout', function (req, res, next) {
  req.cookies.set('userInfo', null)
  res.json(responseDate)
})

// 获取评论
router.post('/comment', function (req, res) {
  // 内容id
  var contentid = req.body.contentid || ''
  // 查询文章内容
  Content.findOne({
      _id: contentid
  }).then(function (content) {
      responseDate.data = content
      responseDate.code = '666'
      res.json(responseDate)
      return
  })
})

// 用户评论
router.post('/comment/post', function (req, res) {
  
  if (req.body.content == '') {
  	responseDate.message = '数据不能为空'
    responseDate.code = '999'
    res.json(responseDate)
    return
  }
  
  // 内容id
  var contentid = req.body.contentid || ''
  var postDate = {
    username: req.userInfo.username,
    postTime: new Date(),
    content: req.body.content
  }
  
  // 查询文章内容
  Content.findOne({
    _id: contentid
  }).then(function (content) {
    content.comments.push(postDate)
    return content.save()
  }).then(function (newContent) {
    responseDate.message = '评论成功'
    responseDate.data = newContent
    responseDate.code = '666'
    res.json(responseDate)
  })
})

module.exports = router;
