define(function(){"use strict";var a={rootUrl:null,selectedUrl:null,resultKey:null,selected:null,webspace:null,locale:null,selectCallback:function(a){}},b={actionIcon:"fa-check-circle",sortable:!1,showStatus:!1,responsive:!1,showOptions:!1},c="smart-content.datasource.";return{events:{names:{setSelected:{postFix:"set-selected",type:"on"}},namespace:c},initialize:function(){this.sandbox.logger.log("initialize",this),this.options=this.sandbox.util.extend(!0,{},a,this.options),this.selected=this.options.selected,this.render(),this.columnNavigationOptions=this.sandbox.util.extend(!0,{},b,{el:this.$columnNavigationElement,instanceName:"smart-content-"+this.options.instanceName,resultKey:this.options.resultKey,url:this.getUrl(),selected:this.selected,actionCallback:function(a){this.selected=a.id,this.options.selectCallback(a.id,a.title)}.bind(this)}),this.startColumnNavigation(this.columnNavigationOptions).then(this.bindCustomEvents.bind(this))},setSelected:function(a){this.selected=a,this.sandbox.emit("husky.column-navigation.smart-content-"+this.options.instanceName+".set-options",{selected:this.selected,url:this.getUrl()})},getUrl:function(){return this.selected?this.prepareUrl(this.options.selectedUrl):this.prepareUrl(this.options.rootUrl)},prepareUrl:function(a){return a=a.replace("{locale}",this.options.locale),a=a.replace("{datasource}",this.selected)},startColumnNavigation:function(a){return this.sandbox.start([{name:"column-navigation@husky",options:a}])},render:function(){this.$columnNavigationElement=this.sandbox.dom.createElement("<div/>"),this.html(this.$columnNavigationElement)},bindCustomEvents:function(){this.events.setSelected(this.setSelected.bind(this))}}});