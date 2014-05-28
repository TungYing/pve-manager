Ext.define('PVE.IPSetList', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pveIPSetList',

    ipset_panel: undefined,

    base_url: undefined,

    addBtn: undefined,
    removeBtn: undefined,
    editBtn: undefined,

    initComponent: function() {
	/*jslint confusion: true */
        var me = this;

	if (me.ipset_panel == undefined) {
	    throw "no rule panel specified";
	}

	if (me.base_url == undefined) {
	    throw "no base_url specified";
	}

	var store = new Ext.data.Store({
	    fields: [ 'name', 'comment', 'digest' ],
	    proxy: {
		type: 'pve',
		url: "/api2/json" + me.base_url
	    },
	    idProperty: 'name',
	    sorters: {
		property: 'name',
		order: 'DESC'
	    }
	});

	var sm = Ext.create('Ext.selection.RowModel', {});

	var reload = function() {
	    var oldrec = sm.getSelection()[0];
	    store.load(function(records, operation, success) {
		if (oldrec) {
		    var rec = store.findRecord('name', oldrec.data.name);
		    if (rec) {
			sm.select(rec);
		    }
		}
	    });
	};

	var run_editor = function() {
	    var rec = sm.getSelection()[0];
	    if (!rec) {
		return;
	    }
	    var win = Ext.create('PVE.window.Edit', {
		subject: "IPSet '" + rec.data.name + "'",
		url: me.base_url,
		method: 'POST',
		digest: rec.data.digest,
		items: [
		    {
			xtype: 'hiddenfield',
			name: 'rename',
			value: rec.data.name
		    },
		    {
			xtype: 'textfield',
			name: 'name',
			value: rec.data.name,
			fieldLabel: gettext('Name'),
			allowBlank: false
		    },
		    {
			xtype: 'textfield',
			name: 'comment',
			value: rec.data.comment,
			fieldLabel: gettext('Comment')
		    }
		]
	    });
	    win.show();
	    win.on('destroy', reload);
	};

	me.editBtn = new PVE.button.Button({
	    text: gettext('Edit'),
	    disabled: true,
	    selModel: sm,
	    handler: run_editor
	});

	me.addBtn = new PVE.button.Button({
	    text: gettext('Create'),
	    handler: function() {
		sm.deselectAll();
		var win = Ext.create('PVE.window.Edit', {
		    subject: 'IPSet',
		    url: me.base_url,
		    method: 'POST',
		    items: [
			{
			    xtype: 'textfield',
			    name: 'name',
			    value: '',
			    fieldLabel: gettext('Name'),
			    allowBlank: false
			},
			{
			    xtype: 'textfield',
			    name: 'comment',
			    value: '',
			    fieldLabel: gettext('Comment')
			}
		    ]
		});
		win.show();
		win.on('destroy', reload);

	    }
	});

	me.removeBtn = new PVE.button.Button({
	    text: gettext('Remove'),
	    selModel: sm,
	    disabled: true,
	    handler: function() {
		var rec = sm.getSelection()[0];
		if (!rec || !me.base_url) {
		    return;
		}
		PVE.Utils.API2Request({
		    url: me.base_url + '/' + rec.data.name,
		    method: 'DELETE',
		    waitMsgTarget: me,
		    failure: function(response, options) {
			Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    },
		    callback: reload
		});
	    }
	});

	Ext.apply(me, {
	    store: store,
	    tbar: [ '<b>IPSet:</b>', me.addBtn, me.removeBtn, me.editBtn ],
	    selModel: sm,
	    columns: [
		{ header: 'IPSet', dataIndex: 'name', width: 100 },
		{ header: gettext('Comment'), dataIndex: 'comment', flex: 1 }
	    ],
	    listeners: {
		itemdblclick: run_editor,
		select: function(sm, rec) {
		    var url = me.base_url + '/' + rec.data.name;
		    me.ipset_panel.setBaseUrl(url);
		},
		deselect: function() {
		    me.ipset_panel.setBaseUrl(undefined);
		},
		show: reload
	    }
	});

	me.callParent();

	store.load();
    }
});

Ext.define('PVE.IPSetCidrEdit', {
    extend: 'PVE.window.Edit',

    cidr: undefined,

    initComponent : function() {
	/*jslint confusion: true */
	var me = this;

	me.create = (me.cidr === undefined);

	if (me.create) {
            me.url = '/api2/extjs' + me.base_url;
            me.method = 'POST';
        } else {
            me.url = '/api2/extjs' + me.base_url + '/' + me.cidr;
            me.method = 'PUT';
        }

	var ipanel = Ext.create('PVE.panel.InputPanel', {
	    create: me.create,
	    column1: [
		{
		    xtype: me.create ? 'textfield' : 'displayfield',
		    name: 'cidr',
		    height: 22, // hack: set same height as text fields
		    value: '',
		    fieldLabel: gettext('IP/CIDR')
		}
	    ],
	    column2: [
		{
		    xtype: 'pvecheckbox',
		    name: 'nomatch',
		    checked: false,
		    height: 22, // hack: set same height as text fields
		    uncheckedValue: 0,
		    fieldLabel: gettext('nomatch')
		}
	    ],
	    columnB: [
		{
		    xtype: 'textfield',
		    name: 'comment',
		    value: '',
		    fieldLabel: gettext('Comment')
		}
	    ]
	});

	Ext.apply(me, {
	    subject: gettext('IP/CIDR'),
	    items: [ ipanel ]
	});

	me.callParent();

	if (!me.create) {
	    me.load({
		success:  function(response, options) {
		    var values = response.result.data;
		    ipanel.setValues(values);
		}
	    });
	}
    }
});

Ext.define('PVE.IPSetGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pveIPSetGrid',

    base_url: undefined,

    addBtn: undefined,
    removeBtn: undefined,
    editBtn: undefined,

    setBaseUrl: function(url) {
        var me = this;

	me.base_url = url;

	if (url === undefined) {
	    me.addBtn.setDisabled(true);
	    me.store.removeAll();
	} else {
	    me.addBtn.setDisabled(false);
	    me.store.setProxy({
		type: 'pve',
		url: '/api2/json' + url
	    });

	    me.store.load();
	}
    },

    initComponent: function() {
	/*jslint confusion: true */
        var me = this;

	var store = new Ext.data.Store({
	    model: 'pve-ipset'
	});

	var reload = function() {
	    store.load();
	};

	var sm = Ext.create('Ext.selection.RowModel', {});

	var run_editor = function() {
	    var rec = sm.getSelection()[0];
	    if (!rec) {
		return;
	    }
	    var win = Ext.create('PVE.IPSetCidrEdit', {
		base_url: me.base_url,
		cidr: rec.data.cidr
	    });
	    win.show();
	    win.on('destroy', reload);
	};

	me.editBtn = new PVE.button.Button({
	    text: gettext('Edit'),
	    disabled: true,
	    selModel: sm,
	    handler: run_editor
	});

	me.addBtn = new PVE.button.Button({
	    text: gettext('Add'),
	    disabled: true,
	    handler: function() {
		if (!me.base_url) {
		    return;
		}
		var win = Ext.create('PVE.IPSetCidrEdit', {
		    base_url: me.base_url
		});
		win.show();
		win.on('destroy', reload);
	    }
	});

	me.removeBtn = new PVE.button.Button({
	    text: gettext('Remove'),
	    selModel: sm,
	    disabled: true,
	    handler: function() {
		var rec = sm.getSelection()[0];
		if (!rec || !me.base_url) {
		    return;
		}

		PVE.Utils.API2Request({
		    url: me.base_url + '/' + rec.data.cidr,
		    method: 'DELETE',
		    waitMsgTarget: me,
		    failure: function(response, options) {
			Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    },
		    callback: reload
		});
	    }
	});

	Ext.apply(me, {
	    tbar: [ '<b>IP/CIDR:</b>', me.addBtn, me.removeBtn, me.editBtn ],
	    store: store,
	    selModel: sm,
	    listeners: {
		itemdblclick: run_editor
	    },
	    columns: [
		{
		    xtype: 'rownumberer'
		},
		{
		    header: gettext('IP/CIDR'),
		    dataIndex: 'cidr',
		    width: 150,
		    renderer: function(value, metaData, record) {
			if (record.data.nomatch) {
			    return '<b>! </b>' + value;
			}
			return value;
		    }
		},
		{
		    header: gettext('Comment'),
		    dataIndex: 'comment',
		    flex: 1,
		    renderer: function(value) {
			return Ext.util.Format.htmlEncode(value);
		    }
		}
	    ]
	});

	me.callParent();

	if (me.base_url) {
	    me.setBaseUrl(me.base_url); // load
	}
    }
}, function() {

    Ext.define('pve-ipset', {
	extend: 'Ext.data.Model',
	fields: [ { name: 'nomatch', type: 'boolean' },
		  'cidr', 'comment' ],
	idProperty: 'cidr'
    });

});

Ext.define('PVE.IPSet', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.pveIPSet',

    title: 'IPSet',

    initComponent: function() {
	var me = this;

	var ipset_panel = Ext.createWidget('pveIPSetGrid', {
	    region: 'center',
	    flex: 0.5,
	    border: false
	});

	var ipset_list = Ext.createWidget('pveIPSetList', {
	    region: 'west',
	    ipset_panel: ipset_panel,
	    base_url: me.base_url,
	    flex: 0.5,
	    border: false,
	    split: true
	});

	Ext.apply(me, {
            layout: 'border',
            items: [ ipset_list, ipset_panel ],
	    listeners: {
		show: function() {
		    ipset_list.fireEvent('show', ipset_list);
		}
	    }
	});

	me.callParent();
    }
});