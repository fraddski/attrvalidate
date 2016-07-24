/**
* attrvalidate jQuery plugin v1.1
* http://github.com/fraddski/attrvalidate
* Licensed under MIT
*/
(function($){

  var functions = {
    reset: resetValidation
  };

  var settings;
  var _reqForm;
  var _indicatorTemplate = '<span class="error-indicator" role="alert" aria-live="assertive" aria-hidden="true"></span>';
  var _summaryTemplate = '<div id="errorSummary" class="alert alert-danger" role="alert" aria-live="assertive" tabindex="-1"><p>{0}</p></div>';
  var _validationTypes = {
    required: {msg: ' is required' },
    tel: {msg: ' is not a valid phone number' },
    email: {msg: ' is not a valid email address' },
    date: {msg: ' is not a valid date'},
    number: {msg: ' is not a valid number'}
  };

  $.fn.attrvalidate = function() {
     if (!this.is('form')) {
      return this;
    }

    if (typeof arguments[0] === 'string') {
      var property = arguments[1];
      var newArgs = Array.prototype.slice.call(arguments);
      newArgs.splice(0, 1);
      functions[arguments[0]].apply(this, newArgs);
    } else {
      setupFormValidation.apply(this, arguments);
    }

    return this;
  };


  function resetValidation(){
    $(_reqForm).find('input, select, textarea, fieldset').removeClass('invalid');
    $(_reqForm).find('.error-indicator').attr('aria-hidden', true);
    $(_reqForm).find('#errorSummary').remove();
  }

  function setupFormValidation(options){
    settings = $.extend({
      showFieldIndicator: true,
      showErrorSummary: true,
      errorSummaryMsg: 'Please fix the following issues before continuing:',
      validateTel: true,
      telRegex: /^\+*[\d-()]{7,20}$/,
      validateEmail: true,
      emailRegex: /^(\S+@\S+)*$/,
      validateDate: true,
      validateNumber: true
    }, options);

    _reqForm = this;
    initialiseValidation();
    $(_reqForm).bind('submit', handleSubmit);
  }

  function initialiseValidation(){
    var _groupsInitialised = [];
    $(_reqForm).find('input, select[required], textarea[required]').each(function(){
      if (isRadioGroup($(this)) && $(this).is('[required]')) {
        var groupName = $(this).attr('name');
        if ($.inArray(groupName, _groupsInitialised) === -1) {
          $(this).attr('data-do-validate', true);
          setFieldName($(this));

          if (settings.showFieldIndicator){
            $(this).parents('fieldset').first().append($(_indicatorTemplate));
          }

          $(_reqForm).find('input[name="' + $(this).attr('name') + '"]').each(function(){
            $(this).change(function(){
              handleFieldChanged($(this));
            });
          });
          _groupsInitialised.push(groupName);
        }
      } else {
        if ($(this).is('[required]') ||
          (settings.validateTel && $(this).is('input[type="tel"]')) ||
          (settings.validateEmail && $(this).is('input[type="email"]')) ||
          (settings.validateDate && $(this).is('input[type="date"]')) ||
          (settings.validateNumber && $(this).is('input[type="number"]'))){

          $(this).attr('data-do-validate', true);
          setFieldName($(this));

          if (settings.showFieldIndicator){
            if (($(this).is('input[type="radio"]') || $(this).is('input[type="checkbox"]')) && $(this).next('label').length > 0) {
              $(this).next('label').after($(_indicatorTemplate));
            } else {
              $(this).after($(_indicatorTemplate));
            }
          }

          $(this).change(function(){
            handleFieldChanged($(this));
          });
        }
      }
    });
  }

  function handleFieldChanged(elem){
    var validationResult = validateField(elem);
    if (validationResult.isValid) {
      clearFieldError(elem);
    } else {
      var fieldMsg = getFieldMessage(elem, validationResult.type);
      showFieldError(elem, fieldMsg);
    }
  }

  function handleSubmit(e){
    e.preventDefault();
    var formValid = true;
    var errorMessages = [];

    $(_reqForm).find('#errorSummary').remove();

    $(_reqForm).find('[data-do-validate="true"]').each(function(){
      var validationResult = validateField($(this));
      if (!validationResult.isValid) {
        var fieldMsg = getFieldMessage($(this), validationResult.type);
        errorMessages.push({ elem: $(this).prop('id'), msg: fieldMsg });
        showFieldError($(this), fieldMsg);
        formValid = false;
      } else {
        clearFieldError($(this));
      }
    });

    if (!formValid) {
      if (settings.showErrorSummary) {
        showErrorSummary(errorMessages);
      }
      return false;
    } else {
      if (typeof(settings.submitFunction) !== 'undefined') {
        settings.submitFunction();
      } else {
        _reqForm[0].submit();
      }
    }
  }

  function validateField(elem){
    if (!elem.is(':visible') || elem.parents('[aria-hidden="true"]').length > 0){
      return { isValid: true };
    }

    if (elem.is('input[type="radio"]')) {
      if (elem.is('[required]')){
        if (isRadioGroup(elem)) {
          return { isValid: ($(_reqForm).find('input[name="' + elem.attr('name') + '"]:checked').length > 0), type: _validationTypes.required };
        } else {
          return { isValid: elem.is(':checked'), type: _validationTypes.required };
        }
      } else {
        return { isValid: true };
      }
    } else if (elem.is('input[type="checkbox"]')) {
      return { isValid: (!elem.is('[required]') || elem.is(':checked')), type: _validationTypes.required };
    } else {
      if (elem.is('[required]') && (elem.val() === '')) {
        return { isValid: false, type: _validationTypes.required };
      } else if (settings.validateTel && elem.is('input[type="tel"]')) {
        return { isValid: settings.telRegex.test(elem.val().replace(/ /g, '')), type: _validationTypes.tel };
      } else if (settings.validateEmail && elem.is('input[type="email"]')) {
        return { isValid: settings.emailRegex.test(elem.val().trim()), type: _validationTypes.email };
      } else if (settings.validateDate && elem.is('input[type="date"]')) {
        var doesPass;
        if (elem.val().trim() === '') {
          doesPass = true;
        } else if (isNaN(Date.parse(elem.val()))) {
          doesPass = false;
        } else if (elem.prop('max') && !isNaN(Date.parse(elem.prop('max'))) && Date.parse(elem.val()) > Date.parse(elem.prop('max'))) {
          doesPass = false;
        } else if (elem.prop('min') && !isNaN(Date.parse(elem.prop('min'))) && Date.parse(elem.val()) < Date.parse(elem.prop('min'))) {
          doesPass = false;
        } else {
          doesPass = true;
        }
        return { isValid: doesPass, type: _validationTypes.date };
      } else if (settings.validateNumber && elem.is('input[type="number"]')) {
        var doesPass;
        if (elem.val().trim() === '') {
          doesPass = true;
        } else if (isNaN(parseFloat(elem.val()))) {
          doesPass = false;
        } else if (elem.prop('max') && !isNaN(parseFloat(elem.prop('max'))) && parseFloat(elem.val()) > parseFloat(elem.prop('max'))) {
          doesPass = false;
        } else if (elem.prop('min') && !isNaN(parseFloat(elem.prop('min'))) && parseFloat(elem.val()) < parseFloat(elem.prop('min'))) {
          doesPass = false;
        } else {
          doesPass = true;
        }
        return { isValid: doesPass, type: _validationTypes.number };
      } else {
        return { isValid: true };
      }
    }
  }

  function setFieldName(elem){
    if (typeof(elem.data('error-msg')) !== 'undefined' && elem.data('error-msg') !== '') {
      return;
    }
    var elemName;
    var forLabel = $(_reqForm).find('label[for="' + elem.attr('id') + '"]');
    if (forLabel.length > 0 && $(forLabel[0]).text() !== '') {
      elemName = $(forLabel[0]).text();
    } else {
      elemName = elem.attr('name');
    }
    elem.data('error-name', elemName);
  }

  function getFieldMessage(elem, resultType){
    var elemMsg;
    if (typeof(elem.data('error-msg')) !== 'undefined' && elem.data('error-msg') !== '') {
      elemMsg = elem.data('error-msg');
    } else {
      elemMsg = elem.data('error-name') + resultType.msg;
    }
    return elemMsg;
  }

  function showFieldError(elem, fieldMsg){
    if (isRadioGroup(elem)) {
      elem.parents('fieldset').first().addClass('invalid');
      if (settings.showFieldIndicator){
        elem.parents('fieldset').first().find('.error-indicator').first().text(fieldMsg).attr('aria-hidden', false);
      }
    } else {
      elem.addClass('invalid');
      if (settings.showFieldIndicator){
        elem.nextAll('.error-indicator').first().text(fieldMsg).attr('aria-hidden', false);
      }
    }
  }

  function clearFieldError(elem){
    if (isRadioGroup(elem)) {
      elem.parents('fieldset').removeClass('invalid');
      if (settings.showFieldIndicator){
        elem.parents('fieldset').first().find('.error-indicator').first().attr('aria-hidden', true);
      }
      var firstInGroup = $(_reqForm).find('input[name="' + elem.attr('name') + '"]').first();
      var summaryItem = $('#errorSummary li a[data-field="' + firstInGroup.attr('id') + '"]');
      if (summaryItem.length > 0) {
        summaryItem.parent('li').remove();
        if ($('#errorSummary ul li').length === 0) {
          $('#errorSummary').remove();
        }
      }
    } else {
      elem.removeClass('invalid');
      if (settings.showFieldIndicator){
        elem.nextAll('.error-indicator').first().attr('aria-hidden', true);
      }
      var summaryItem = $('#errorSummary li a[data-field="' + elem.attr('id') + '"]');
      if (summaryItem.length > 0) {
        summaryItem.parent('li').remove();
        if ($('#errorSummary ul li').length === 0) {
          $('#errorSummary').remove();
        }
      }
    }
  }

  function showErrorSummary(errorMsgList){
    var errorSummary = $(_summaryTemplate.replace('{0}', settings.errorSummaryMsg));
    var errorList = $('<ul></ul>');

    for (var i=0; i < errorMsgList.length; i++) {
      var errorLink = $('<a href="#" data-field="' + errorMsgList[i].elem + '">' + errorMsgList[i].msg + '</a>');
      errorLink.click(function(){ jumpToElem($(this).data('field')); return false; });
      var errorItm = $('<li></li>');
      errorItm.append(errorLink);
      errorList.append(errorItm);
    }

    errorSummary.append(errorList).prependTo($(_reqForm));
    errorSummary.focus();
  }

  function isRadioGroup(elem){
    return (elem.is('input[type="radio"]') && typeof(elem.attr('name')) !== 'undefined' && elem.attr('name') !== '');
  }

  function jumpToElem(fieldId){
    $(_reqForm).find('#' + fieldId).focus();
  }

}(jQuery));
