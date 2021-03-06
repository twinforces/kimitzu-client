import React, { ChangeEvent, useEffect, useState } from 'react'

import { EmploymentHistory } from '../../interfaces/Profile'
import { Button } from '../Button'
import { TwoInputs } from '../Input'
import { FormLabel } from '../Label'
import { FormSelector } from '../Selector'

import Countries from '../../constants/Countries.json'
import Profile from '../../models/Profile'
import decodeHtml from '../../utils/Unescape'

import { localeInstance } from '../../i18n'

import '../Input/TwoInputs.css'
import './AddressForm.css'

interface Props {
  profile: Profile
  isEdit: boolean
  updateIndex: number
  isListing?: boolean
  handleProfileSave: () => void
}

const EmploymentForm = ({ profile, updateIndex, isEdit, handleProfileSave }: Props) => {
  const employmentHistory = profile.background!.employmentHistory
  const defaultObject = {
    company: '',
    role: '',
    description: '',
    location: {
      city: '',
      country: '',
    },
    period: {
      from: new Date(),
      to: new Date(),
    },
  } as EmploymentHistory
  const {
    localizations,
    localizations: { employmentForm, addressForm },
  } = localeInstance.get
  const [isWorkingHere, setIsWorkingHere] = useState(false)
  const [employment, setEmployment] = useState(defaultObject)
  const [targetIndex, setTargetIndex] = useState(updateIndex)

  useEffect(() => {
    let target: EmploymentHistory

    if (isEdit) {
      target = employmentHistory[targetIndex]
      setTargetIndex(targetIndex)
    } else {
      employmentHistory.push(defaultObject)
      const currentIndex = employmentHistory.length - 1
      setTargetIndex(currentIndex)
      target = employmentHistory[currentIndex]
    }
    if (!target.period || !target.location) {
      target = defaultObject
    }
    if (target.period) {
      setIsWorkingHere(!target.period!.to)
    }
    setEmployment(target)
  }, [])

  const handleChange = (field, value) => {
    setEmployment({ ...employment, [field]: value } as EmploymentHistory)
  }

  return (
    <form
      className="uk-form-stacked uk-width-1-1"
      onSubmit={evt => {
        evt.preventDefault()
        profile.background!.employmentHistory[targetIndex] = employment
        handleProfileSave()
      }}
    >
      <fieldset className="uk-fieldset">
        <div className="uk-margin">
          <FormLabel label={employmentForm.companyLabel} required />
          <input
            className="uk-input"
            type="text"
            value={decodeHtml(employment.company)}
            placeholder={employmentForm.companyLabel}
            required
            onChange={evt => {
              handleChange('company', evt.target.value)
            }}
          />
        </div>
        <div className="uk-margin">
          <FormLabel label={employmentForm.positionLabel} required />
          <input
            className="uk-input"
            type="text"
            value={decodeHtml(employment.role)}
            placeholder={employmentForm.positionPlaceholder}
            required
            onChange={evt => {
              handleChange('role', evt.target.value)
            }}
          />
        </div>
        <div className="uk-margin">
          <FormLabel label={localizations.descriptionLabel} required />
          <textarea
            className="uk-textarea"
            rows={5}
            value={decodeHtml(employment.description)}
            placeholder={employmentForm.descriptionPlaceholder}
            required
            onChange={evt => {
              handleChange('description', evt.target.value)
            }}
          />
        </div>
        <div className="uk-margin">
          <label>
            <input
              className="uk-checkbox"
              type="checkbox"
              checked={isWorkingHere}
              onChange={evt => {
                if (evt.target.checked) {
                  delete employment.period!.to
                  handleChange('period', employment.period!)
                } else {
                  employment.period!.to = new Date()
                  handleChange('period', employment.period!)
                }
                setIsWorkingHere(evt.target.checked)
              }}
            />{' '}
            {employmentForm.currentlyWorkingLabel}
          </label>
        </div>
        <TwoInputs
          input1={{
            label: localizations.startDateLabel,
            props: {
              type: 'date',
              required: true,
              value: employment.period!.from.toLocaleDateString('en-CA'),
              onChange: (evt: ChangeEvent<HTMLInputElement>) => {
                employment.period!.from = new Date(evt.target.value)
                handleChange('period', employment.period!)
              },
            },
            required: true,
          }}
          input2={{
            label: localizations.endDateLabel,
            props: {
              type: 'date',
              value: !isWorkingHere ? employment.period!.to.toLocaleDateString('en-CA') : '',
              onChange: (evt: ChangeEvent<HTMLInputElement>) => {
                employment.period!.to = new Date(evt.target.value)
                handleChange('period', employment.period!)
              },
            },
            hidden: isWorkingHere,
          }}
        />
        <div className="uk-margin uk-flex uk-flex-row">
          <div className="uk-width-1-2 uk-margin-right">
            <FormLabel label={addressForm.cityLabel} required />
            <input
              className="uk-input"
              value={decodeHtml(employment.location.city)}
              placeholder={addressForm.cityLabel}
              required
              onChange={evt => {
                employment.location.city = evt.target.value
                handleChange('location', employment.location)
              }}
            />
          </div>
          <div className="uk-width-1-2">
            <FormLabel label={addressForm.countryLabel} required />
            <FormSelector
              options={Countries}
              defaultVal={employment.location.country || ''}
              onChange={evt => {
                employment.location.country = evt.target.value
                handleChange('country', employment.location)
              }}
              required
            />
          </div>
        </div>
      </fieldset>
      <div id="save-btn-div">
        {isEdit ? (
          <Button
            className="uk-button uk-button-danger uk-margin-right"
            type="button"
            onClick={evt => {
              evt.preventDefault()
              employmentHistory.splice(updateIndex!, 1)
              handleProfileSave()
            }}
          >
            {localizations.deleteBtnText.toUpperCase()}
          </Button>
        ) : null}
        <Button className="uk-button uk-button-primary" type="submit">
          {localizations.saveBtnText.toUpperCase()}
        </Button>
      </div>
    </form>
  )
}

export default EmploymentForm
