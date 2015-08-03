/*
 * This file is part of the Sulu CMS.
 *
 * (c) MASSIVE ART WebServices GmbH
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.
 */

define([
    'services/sulucontact/account-manager',
    'sulucontact/models/account',
    'sulucontact/models/contact',
    'sulucontact/models/accountContact',
    'sulucontact/models/email',
    'sulucontact/models/emailType',
    'sulumedia/model/media',
    'sulucategory/model/category',
    'accountsutil/delete-dialog'
], function(
    AccountManager,
    Account,
    Contact,
    AccountContact,
    Email,
    EmailType,
    Media,
    Category,
    DeleteDialog) {

    'use strict';

    return {

        initialize: function() {
            this.bindCustomEvents();
            this.bindSidebarEvents();
            this.account = null;

            this.renderByDisplay();
        },

        renderByDisplay: function() {
            if (this.options.display === 'list') {
                this.renderList();
            } else if (this.options.display === 'edit') {
                this.renderEdit();
            } else {
                throw 'display type wrong';
            }
        },

        bindCustomEvents: function() {
            // delete contact
            this.sandbox.on('sulu.contacts.account.delete', this.del.bind(this)); // todo: manager-service

            // save the current package
            this.sandbox.on('sulu.contacts.accounts.save', this.save.bind(this)); // done

            // wait for navigation events
            this.sandbox.on('sulu.contacts.accounts.load', this.load.bind(this)); // todo: navigate-service

            // wait for navigation events
            this.sandbox.on('sulu.contacts.contact.load', this.loadContact.bind(this)); // todo: navigate-service

            // add new contact
            this.sandbox.on('sulu.contacts.accounts.new', this.add.bind(this)); // todo: navigate-service

            // delete selected contacts
            this.sandbox.on('sulu.contacts.accounts.delete', this.delAccounts.bind(this)); // todo: manager-service

            // adds a new accountContact Relation
            this.sandbox.on('sulu.contacts.accounts.contact.save', this.addAccountContact.bind(this)); // todo: manager-service

            // removes accountContact Relation
            this.sandbox.on('sulu.contacts.accounts.contacts.remove', this.removeAccountContacts.bind(this)); // todo: manager-service

            // set main contact
            this.sandbox.on('sulu.contacts.accounts.contacts.set-main', this.setMainContact.bind(this)); // todo: manager-service

            // load list view
            this.sandbox.on('sulu.contacts.accounts.list', this.navigateToList.bind(this)); // todo: navigate-service

            // handling documents
            this.sandbox.on('sulu.contacts.accounts.medias.save', this.saveDocuments.bind(this)); // todo: manager-service

            // receive form of address values via template
            this.sandbox.on('sulu.contacts.set-types', function(types) {
                this.formOfAddress = types.formOfAddress;
                this.emailTypes = types.emailTypes;
            }.bind(this));

            // pass them on to the contact tab when fully loaded
            this.sandbox.on('sulu.contacts.accounts.contacts.initialized', function() {
                this.sandbox.emit('sulu.contacts.accounts.set-form-of-address', this.formOfAddress);
            }.bind(this));

            // add a new contact
            this.sandbox.on('sulu.contacts.accounts.new.contact', this.createNewContact.bind(this));
        },

        /**
         * navigate to accounts list
         * @param account
         * @param noReload
         */
        navigateToList: function(account, noReload) {
            this.sandbox.emit(
                'sulu.router.navigate', 'contacts/accounts',
                !noReload,
                true,
                true
            );
        },

        /**
         * adds a new contact and assigns the current account to it
         */
        createNewContact: function(data) {
            var contact = new Contact(data);
            contact.set('emails', [
                new Email({
                    email: data.email,
                    emailType: EmailType.findOrCreate({id: this.emailTypes[0].id})
                })
            ]);
            contact.save(null, {
                success: function(response) {
                    var model = response.toJSON();
                    this.sandbox.emit('sulu.contacts.accounts.contact.created', model);
                }.bind(this),
                error: function() {
                    this.sandbox.logger.log("error while saving a new contact");
                }.bind(this)
            });
        },

        saveDocuments: function(accountId, newMediaIds, removedMediaIds, action) {
            this.sandbox.emit('sulu.header.toolbar.item.loading', 'save');

            this.sandbox.logger.warn('newMediaIds', newMediaIds);
            this.sandbox.logger.warn('removedMediaIds', removedMediaIds);

            this.processAjaxForDocuments(newMediaIds, accountId, 'POST', action);
            this.processAjaxForDocuments(removedMediaIds, accountId, 'DELETE', action);
        },

        processAjaxForDocuments: function(mediaIds, accountId, type, action) {
            var requests=[], medias=[], url;

            if(!!mediaIds.length) {
                this.sandbox.util.each(mediaIds, function(index, id) {
                    if(type === 'DELETE') {
                        url = '/admin/api/accounts/' + accountId + '/medias/' + id;
                    } else if(type === 'POST') {
                        url = '/admin/api/accounts/' + accountId + '/medias';
                    }

                    requests.push(
                        this.sandbox.util.ajax({
                            url: url,
                            data: {mediaId: id},
                            type: type
                        }).fail(function() {
                            this.sandbox.logger.error("Error while saving documents!");
                        }.bind(this))
                    );
                    medias.push(id);
                }.bind(this));

                this.sandbox.util.when.apply(null, requests).then(function() {
                    if(type === 'DELETE') {
                        this.sandbox.emit('sulu.contacts.contacts.medias.removed', medias);
                    } else if(type === 'POST') {
                        this.sandbox.emit('sulu.contacts.contacts.medias.saved', medias);
                    }
                    this.afterSaveAction(action, accountId, false);
                }.bind(this));
            }
        },

        afterSaveAction: function(action, id, wasAdded) {
            if (action == 'back') {
                this.navigateToList();
            } else if (action == 'new') {
                this.sandbox.emit('sulu.router.navigate', 'contacts/accounts/add', true, true);
            } else if (wasAdded) {
                this.sandbox.emit('sulu.router.navigate', 'contacts/accounts/edit:' + id + '/details');
            }
        },

        /**
         * Binds general sidebar events
         */
        bindSidebarEvents: function() {
            this.sandbox.dom.off('#sidebar');

            this.sandbox.dom.on('#sidebar', 'click', function(event) {
                var id = this.sandbox.dom.data(event.currentTarget, 'id');
                this.sandbox.emit('sulu.contacts.accounts.load', id);
            }.bind(this), '#sidebar-accounts-list');

            this.sandbox.dom.on('#sidebar', 'click', function(event) {
                var id = this.sandbox.dom.data(event.currentTarget, 'id');
                this.sandbox.emit('sulu.router.navigate', 'contacts/contacts/edit:' + id + '/details');
                this.sandbox.emit('husky.navigation.select-item', 'contacts/contacts');
            }.bind(this), '#main-contact');
        },

        // sets main contact
        setMainContact: function(id) {
            // set mainContact
            this.account.set({mainContact: Contact.findOrCreate({id: id})});
            this.account.save(null, {
                patch: true,
                success: function() {
                    // TODO: show success label
                }.bind(this)
            });
        },

        addAccountContact: function(id, position) {
            // set id to contacts id;
            var accountContact = AccountContact.findOrCreate({
                id: id,
                contact: Contact.findOrCreate({id: id}), account: this.account
            });

            if (!!position) {
                accountContact.set({position: position});
            }

            accountContact.save(null, {
                // on success save contacts id
                success: function(response) {
                    var model = response.toJSON();
                    this.sandbox.emit('sulu.contacts.accounts.contact.saved', model);
                }.bind(this),
                error: function() {
                    this.sandbox.logger.log("error while saving contact");
                }.bind(this)
            });
        },

        /**
         * removes mulitple AccountContacts
         * @param ids
         */
        removeAccountContacts: function(ids) {
            AccountManager.removeAccountContacts(ids);
        },

        // show confirmation and delete account
        del: function() {
            DeleteDialog.showForSingle(this.sandbox, this.account, this.options.id);
        },

        // saves an account
        save: function(data, action) {
            this.sandbox.emit('sulu.header.toolbar.item.loading', 'save');
            AccountManager.save(data).then(function(account) {
                if (!!data.id) {
                    this.sandbox.emit('sulu.contacts.accounts.saved', account);
                }
                this.afterSaveAction(action, account.id, !account.id);
            }.bind(this));
        },

        load: function(id) {
            this.sandbox.emit('sulu.router.navigate', 'contacts/accounts/edit:' + id + '/details');
        },

        loadContact: function(id) {
            this.sandbox.emit('sulu.router.navigate', 'contacts/contacts/edit:' + id + '/details');
        },

        add: function() {
            this.sandbox.emit('sulu.router.navigate', 'contacts/accounts/add');
        },

        delAccounts: function(ids) {
            if (ids.length < 1) {
                this.sandbox.emit('sulu.overlay.show-error', 'sulu.overlay.delete-no-items');
                return;
            }
            this.showDeleteConfirmation(ids);
        },

        renderList: function() {
            var $list = this.sandbox.dom.createElement('<div id="accounts-list-container"/>');
            this.html($list);
            this.sandbox.start([
                {
                    name: 'accounts/list@sulucontact',
                    options: {
                        el: $list
                    }
                }
            ]);
        },

        renderEdit: function() {
            this.account = new Account();
            var $edit = this.sandbox.dom.createElement('<div id="accounts-edit-container"/>'),
                startComponent = function(model) {
                    this.sandbox.start([{
                        name: 'accounts/edit@sulucontact',
                        options: {
                            el: $edit,
                            data: model.toJSON(),
                            id: this.options.id
                        }
                    }]);
                };
            this.html($edit);

            if (!!this.options.id) {
                this.account = new Account({id: this.options.id});
                this.account.fetch({
                    success: startComponent.bind(this),
                    error: function() {
                        this.sandbox.logger.log("error while fetching contact");
                    }.bind(this)
                });
            } else {
                startComponent(this.account.toJSON());
            }
        },

        showDeleteConfirmation: function(ids) {
            if (ids.length === 0) {
                return;
            } else if (ids.length === 1) {
                // if only one account was selected - get related sub-companies and contacts (and show the first 3 ones)
                //this.confirmSingleDeleteDialog(ids[0], callbackFunction);
                DeleteDialog.showForSingle(this.sandbox, Account.findOrCreate({id:ids[0]}), ids[0], true)
            } else {
                // if multiple accounts were selected, get related sub-companies and show simplified message
                //this.confirmMultipleDeleteDialog(ids, callbackFunction);
                DeleteDialog.showForMultiple(this.sandbox, ids);
            }
        }
    };
});
