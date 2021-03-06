import { useMutation } from '@apollo/react-hooks';
import { useNotification } from 'react-shared';

import { CREATE_MANY_EVENT_TRIGGERS } from 'components/Lambdas/gql/mutations';
import extractGraphQlErrors from 'shared/graphqlErrorExtractor';

import { formatMessage } from 'components/Lambdas/helpers/misc';
import { GQL_MUTATIONS } from 'components/Lambdas/constants';
import { CONFIG } from 'components/Lambdas/config';

export const useCreateManyEventTriggers = (
  { name, namespace, subscriberRef, ownerRef },
  mutationOptions = {},
) => {
  const notificationManager = useNotification();
  const [createManyEventTriggersMutation] = useMutation(
    CREATE_MANY_EVENT_TRIGGERS,
    mutationOptions,
  );

  function handleError(error, isSingleTrigger) {
    const errorToDisplay = extractGraphQlErrors(error);

    const message = isSingleTrigger
      ? GQL_MUTATIONS.CREATE_TRIGGERS.ERROR_MESSAGE_SINGLE
      : GQL_MUTATIONS.CREATE_TRIGGERS.ERROR_MESSAGE_MANY;

    const formattedMessage = formatMessage(message, {
      lambdaName: name,
      error: errorToDisplay,
    });

    notificationManager.notifyError({
      content: formattedMessage,
      autoClose: false,
    });
  }

  function prepareEventTriggersInput(events) {
    return events.map(event => {
      const trigger = {
        broker: CONFIG.triggerSubscriber.broker,
        filterAttributes: {
          type: event.eventType,
          source: event.source,
        },
        subscriber: { ...subscriberRef, port: event.port, path: event.path },
      };

      // version doesn't have to be
      if (event.version) {
        trigger.filterAttributes.eventtypeversion = event.version;
      }

      return trigger;
    });
  }

  async function createManyEventTriggers(events) {
    const triggers = prepareEventTriggersInput(events);
    const isSingleTrigger = triggers.length === 1;

    try {
      const response = await createManyEventTriggersMutation({
        variables: {
          namespace,
          triggers,
          ownerRef: [ownerRef],
        },
      });

      if (response.error) {
        handleError(response.error, isSingleTrigger);
        return;
      }

      const message = isSingleTrigger
        ? GQL_MUTATIONS.CREATE_TRIGGERS.SUCCESS_MESSAGE_SINGLE
        : GQL_MUTATIONS.CREATE_TRIGGERS.SUCCESS_MESSAGE_MANY;

      notificationManager.notifySuccess({
        content: message,
      });
    } catch (err) {
      handleError(err, isSingleTrigger);
    }
  }

  return createManyEventTriggers;
};
