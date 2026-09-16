---
title: Gaffer Scale from Object Normal
description: 沿着物体法线方向进行缩放，进行膨胀挤出
date: 2026-09-15
tags: ['Gaffer', 'OSL']
cover: /images/gaffer_scale_from_objectN/scale_cow.gif
---

在日常操作中，偶尔需要对物体进行一定量的挤出或者塌陷来消除一些表面的穿帮，打回前环节又太费事了
在Maya中可以通过选面来位移消除这些穿帮，但是在Gaffer中却没有对应的解决办法
现在通过osl可以比较简单的解决这个问题，特此记录一下

## 问题是什么

对于项目中存在的一些小穿插
![模型穿插](/images/gaffer_scale_from_objectN/face_bug.png)
Gaffer这边没有办法通过选面位移或者缩放来消除

## 思路

那其实对于这种问题，想要在gaffer侧来修改的话方法有很多
1.分层渲染，最直接也最不折腾的办法，分层最后在合成里叠回来就行
2.通过osl局部变形来消除这个bug（最优解了），需要解决艺术家侧的选面以及如何操作面

## 实现

第一种的分层渲染不在讲解范围里，最简单最不吃操作的一项
重点讲解第二种做法，局部变形
首先简单捋一下具体思路：
确定穿帮点的index，给这几个点沿着法线方向乘上一个负数的向量数值来向内塌陷

核心伪代码：

```python
a = getObjectPoint index
newPont = a.transform + customPointVector
```
先来实现第一步：
通过视窗上的属性查看工具找到穿帮物体的点的index，给他加上一个vector数值

```osl
int shadingIndex;  
getattribute( "shading:index", shadingIndex );  
  
point p = P;                       
if( shadingIndex == targetIndex )  
{  
    p = vector((p.x + float( offset )),(p.y + float( offset )),(p.z + float( offset )));     
}  
pOut = p;
```

现在操作就是直接给三个方向都加上一定的偏移，这个是简单一点的做法
对比如下
```compare
![修改前](/images/gaffer_scale_from_objectN/change_old.png)
![修改后](/images/gaffer_scale_from_objectN/change_new.png)
```

那么，对于精细一点的操作，就得沿着法线方向来做偏移
```osl
int shadingIndex;  
getattribute( "shading:index", shadingIndex );  
  
point p = P;  
if( shadingIndex == targetIndex )  
{  
    normal n = 0;  
    getattribute( "N", n );          
    p = p + normalize( n ) * offset; 
}  
pOut = p;
```

## 效果对比

```compare
![修改前](/images/gaffer_scale_from_objectN/change_old.png)
![修改后](/images/gaffer_scale_from_objectN/change_new.png)
```


## 踩过的坑

> osl code 里需要注意的问题

- 根据点的index获取点的实际数据需要使用`getattribute( "shading:index", shadingIndex )`
- 给多点做偏移可以用循环多选index列表传入，一起消除穿帮

## 小结

日常解决办法还是需要打回前环节来处理，这种只是没有办法，特别紧急的情况下才会这样操作。
