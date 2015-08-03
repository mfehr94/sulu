/*
 * This file is part of the Sulu CMS.
 *
 * (c) MASSIVE ART WebServices GmbH
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.
 */

define([
    'sulucontact/models/account',
    'sulucontact/models/contact',
    'sulucontact/models/accountContact',
    'sulucontact/models/email',
    'sulucontact/models/emailType',
    'sulumedia/model/media',
    'sulucategory/model/category',
    'sulucategory/model/category'
], function(
    Account,
    Contact,
    AccountContact,
    Email,
    EmailType,
    Media,
    Category) {

    'use strict';

    var instance = null;

    function AccountManager() {
        this.initialize();
    }

    AccountManager.prototype = {

        initialize: function() {
            this.sandbox = window.App; // TODO: inject context. find better solution
            this.account = null;
        },

        /**
         * loads contact by id
         */
        getAccount: function(id) {
            var promise = this.sandbox.data.deferred();
            this.account = Account.findOrCreate({id: id});

            this.account.fetch({
                success: function(model) {
                    this.account = model;
                    promise.resolve(model);
                }.bind(this),
                error: function() {
                    this.sandbox.logger.log('error while fetching contact');
                    promise.fail();
                }.bind(this)
            });

            return promise;
        },

        /**
         * Saves an account
         * @param data {Object} the account data to save
         * @returns promise
         */
        save: function(data) {
            var promise = this.sandbox.data.deferred();
            this.account = Account.findOrCreate({id: data.id});
            this.account.set(data);

            this.account.get('categories').reset();
            this.sandbox.util.foreach(data.categories, function(categoryId){
                var category = Category.findOrCreate({id: categoryId});
                this.account.get('categories').add(category);
            }.bind(this));

            this.account.save(null, {
                // on success save contacts id
                success: function(response) {
                    var model = response.toJSON();
                    promise.resolve(model);
                }.bind(this),
                error: function() {
                    this.sandbox.logger.error("error while saving account");
                    promise.fail();
                }.bind(this)
            });

            return promise;
        },

        /**
         * Removes multiple account-contacts
         * @param id The id of the account to delete the contacts from
         * @param ids {Array} the id's of the account-contacts to delete
         */
        removeAccountContacts: function(id, ids) {
            // show warning
            this.account = Account.findOrCreate({id: id});
            this.sandbox.emit('sulu.overlay.show-warning', 'sulu.overlay.be-careful', 'sulu.overlay.delete-desc', null, function() {
                // get ids of selected contacts
                var accountContact;
                this.sandbox.util.foreach(ids, function(contactId) {
                    // set account and contact as well as  id to contacts id(so that request is going to be sent)
                    accountContact = AccountContact.findOrCreate({id: id, contact: Contact.findOrCreate({id: contactId}), account: this.account});
                    accountContact.destroy({
                        success: function() {
                            this.sandbox.emit('sulu.contacts.accounts.contacts.removed', contactId);
                        }.bind(this),
                        error: function() {
                            this.sandbox.logger.log("error while deleting AccountContact");
                        }.bind(this)
                    });
                }.bind(this));
            }.bind(this));
        }
    };

    AccountManager.getInstance = function() {
        if (instance == null) {
            instance = new AccountManager();
        }
        return instance;
    }

    return AccountManager.getInstance();
});
