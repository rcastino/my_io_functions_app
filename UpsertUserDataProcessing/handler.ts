import * as express from "express";

import { Context } from "@azure/functions";

import { isLeft } from "fp-ts/lib/Either";

import {
  IResponseErrorConflict,
  IResponseErrorValidation,
  IResponseSuccessJson,
  ResponseErrorFromValidationErrors,
  ResponseSuccessJson
} from "italia-ts-commons/lib/responses";
import { FiscalCode } from "italia-ts-commons/lib/strings";

import {
  IResponseErrorQuery,
  ResponseErrorQuery
} from "io-functions-commons/dist/src/utils/response";

import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { FiscalCodeMiddleware } from "io-functions-commons/dist/src/utils/middlewares/fiscalcode";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";

import { UserDataProcessing as UserDataProcessingApi } from "io-functions-commons/dist/generated/definitions/UserDataProcessing";
import { UserDataProcessingChoiceRequest } from "io-functions-commons/dist/generated/definitions/UserDataProcessingChoiceRequest";
import { UserDataProcessingStatusEnum } from "io-functions-commons/dist/generated/definitions/UserDataProcessingStatus";
import {
  makeUserDataProcessingId,
  UserDataProcessing,
  UserDataProcessingModel
} from "io-functions-commons/dist/src/models/user_data_processing";
import { RequiredBodyPayloadMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import { toUserDataProcessingApi } from "../utils/user_data_processings";

/**
 * Type of an UpsertUserDataProcessing handler.
 */
type IUpsertUserDataProcessingHandler = (
  context: Context,
  fiscalCode: FiscalCode,
  userDataProcessingChoiceRequest: UserDataProcessingChoiceRequest
) => Promise<
  // tslint:disable-next-line: max-union-size
  | IResponseSuccessJson<UserDataProcessingApi>
  | IResponseErrorValidation
  | IResponseErrorQuery
  | IResponseErrorConflict
>;

export function UpsertUserDataProcessingHandler(
  userDataProcessingModel: UserDataProcessingModel
): IUpsertUserDataProcessingHandler {
  return async (context, fiscalCode, upsertUserDataProcessingPayload) => {
    const logPrefix = `UpsertUserDataProcessingHandler|FISCAL_CODE=${
      fiscalCode === undefined ? undefined : fiscalCode.substring(0, 5)
    }`;
    const id = makeUserDataProcessingId(
      upsertUserDataProcessingPayload.choice,
      fiscalCode
    );

    const errorOrMaybeRetrievedUserDataProcessing = await userDataProcessingModel.findOneUserDataProcessingById(
      fiscalCode,
      id
    );

    // compute the request status according to its previous value (when found)
    // This is the machine state table implemented by following code:
    // |current	         |  POST
    // |undefined / none |	PENDING
    // |PENDING	         |  PENDING
    // |WIP	             |  WIP
    // |CLOSED	         |  PENDING
    if (isLeft(errorOrMaybeRetrievedUserDataProcessing)) {
      return ResponseErrorQuery(
        "Error while retrieving a previous version of user data processing",
        errorOrMaybeRetrievedUserDataProcessing.value
      );
    }
    const maybeRetrievedUserDataProcessing =
      errorOrMaybeRetrievedUserDataProcessing.value;
    const computedStatus = maybeRetrievedUserDataProcessing.fold(
      UserDataProcessingStatusEnum.PENDING,
      retrieved => {
        return retrieved.status === UserDataProcessingStatusEnum.WIP
          ? retrieved.status
          : UserDataProcessingStatusEnum.PENDING;
      }
    );
    const userDataProcessing = UserDataProcessing.decode({
      choice: upsertUserDataProcessingPayload.choice,
      createdAt: new Date(),
      fiscalCode,
      status: computedStatus,
      userDataProcessingId: id
    });

    if (isLeft(userDataProcessing)) {
      const error = userDataProcessing.value;
      return ResponseErrorFromValidationErrors(UserDataProcessing)(error);
    } else {
      const errorOrUpsertedUserDataProcessing = await userDataProcessingModel.createOrUpdateByNewOne(
        userDataProcessing.value
      );

      context.log.error(
        `errorOrUpsertedUserDataProcessing ${errorOrUpsertedUserDataProcessing}`
      );
      if (isLeft(errorOrUpsertedUserDataProcessing)) {
        const { body } = errorOrUpsertedUserDataProcessing.value;

        context.log.error(`${logPrefix}|ERROR=${body}`);

        return ResponseErrorQuery(
          "Error while creating a new user data processing",
          errorOrUpsertedUserDataProcessing.value
        );
      }

      const createdOrUpdatedUserDataProcessing =
        errorOrUpsertedUserDataProcessing.value;
      return ResponseSuccessJson(
        toUserDataProcessingApi(createdOrUpdatedUserDataProcessing)
      );
    }
  };
}

/**
 * Wraps an UpsertUserDataProcessing handler inside an Express request handler.
 */
export function UpsertUserDataProcessing(
  userDataProcessingModel: UserDataProcessingModel
): express.RequestHandler {
  const handler = UpsertUserDataProcessingHandler(userDataProcessingModel);

  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    FiscalCodeMiddleware,
    RequiredBodyPayloadMiddleware(UserDataProcessingChoiceRequest)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
}
