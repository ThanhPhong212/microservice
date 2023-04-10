const yup = require('yup');

exports.createServiceValidate = yup.object().shape({
  projectId: yup.string().required(),
  name: yup.string().required(),
  setupEveryDay: yup.array().of(
    yup.object().shape({
      from: yup.string().required(),
      to: yup.string().required(),
      slot: yup.array().of(
        yup.object().shape({
          slotName: yup.string(),
          slotCapacity: yup.number(),
        }),
      ),
    }),
  ),
  setupDayOfWeek: yup.object().shape({
    monday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    tuesday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    wednesday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    thursday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    friday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    saturday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    sunday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
  }),
});

exports.updateServiceValidate = yup.object().shape({
  name: yup.string().nullable(true),
  setupEveryDay: yup.array().of(
    yup.object().shape({
      from: yup.string().required(),
      to: yup.string().required(),
      slot: yup.array().of(
        yup.object().shape({
          slotName: yup.string(),
          slotCapacity: yup.number(),
        }),
      ),
    }),
  ),
  setupDayOfWeek: yup.object().shape({
    monday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    tuesday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    wednesday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    thursday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    friday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    saturday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
    sunday: yup.array().of(
      yup.object().shape({
        from: yup.string().required(),
        to: yup.string().required(),
        slot: yup.array().of(
          yup.object().shape({
            slotName: yup.string(),
            slotCapacity: yup.number(),
          }),
        ),
      }),
    ),
  }),
});
