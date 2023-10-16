import BigNumber from 'bignumber.js';
import { Form, Formik, useFormikContext } from 'formik';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import {
  ProtocolSmallestUnit,
  fromWei,
  fromWeiRounded,
  isValidAddress,
  toWei,
  tryParseAmount,
} from '@hyperlane-xyz/utils';
import { WideChevron } from '@hyperlane-xyz/widgets';

import { SmallSpinner } from '../../components/animation/SmallSpinner';
import { ConnectAwareSubmitButton } from '../../components/buttons/ConnectAwareSubmitButton';
import { SolidButton } from '../../components/buttons/SolidButton';
import { ChevronIcon } from '../../components/icons/Chevron';
import { TextField } from '../../components/input/TextField';
import { config } from '../../consts/config';
import { Color } from '../../styles/Color';
import { logger } from '../../utils/logger';
import { getProtocolType } from '../caip/chains';
import { getTokenAddress, isNonFungibleToken, parseCaip19Id } from '../caip/tokens';
import { ChainSelectField } from '../chains/ChainSelectField';
import { getChainDisplayName } from '../chains/utils';
import { AppState, useStore } from '../store';
import { SelectOrInputTokenIds } from '../tokens/SelectOrInputTokenIds';
import { TokenSelectField } from '../tokens/TokenSelectField';
import { useIsApproveRequired } from '../tokens/approval';
import { useDestinationBalance, useOriginBalance } from '../tokens/balances';
import { useRouteChains } from '../tokens/routes/hooks';
import { RoutesMap } from '../tokens/routes/types';
import { getTokenRoute } from '../tokens/routes/utils';

import { TransferFormValues } from './types';
import { useTokenTransfer } from './useTokenTransfer';

export function TransferTokenForm({ tokenRoutes, invoiceDetails }: any) {
  const chainCaip2Ids = useRouteChains(tokenRoutes);
  const initialValues = useFormInitialValues(chainCaip2Ids, tokenRoutes);

  // Flag for if form is in input vs review mode
  const [isReview, setIsReview] = useState(false);
  // Flag for check current type of token
  const [isNft, setIsNft] = useState(false);

  const balances = useStore((state) => state.balances);

  const validate = (values: TransferFormValues) =>
    validateFormValues(values, tokenRoutes, balances);

  const onSubmitForm = (values: TransferFormValues) => {
    logger.debug('Reviewing transfer form values:', JSON.stringify(values));
    setIsReview(true);
  };

  return (
    <Formik<TransferFormValues>
      initialValues={initialValues}
      onSubmit={onSubmitForm}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      <Form className="flex flex-col items-stretch w-full mt-2">
        <ChainSelectSection chainCaip2Ids={chainCaip2Ids} isReview={isReview} />
        <div className="mt-3 flex justify-between space-x-4">
          <TokenSection tokenRoutes={tokenRoutes} setIsNft={setIsNft} isReview={isReview} />
          <AmountSection
            tokenRoutes={tokenRoutes}
            isNft={isNft}
            isReview={isReview}
            invoiceDetails={invoiceDetails}
          />
        </div>
        <RecipientSection
          tokenRoutes={tokenRoutes}
          isReview={isReview}
          invoiceDetails={invoiceDetails}
        />
        <ReviewDetails
          visible={isReview}
          tokenRoutes={tokenRoutes}
          invoiceDetails={invoiceDetails}
        />
        <ButtonSection
          tokenRoutes={tokenRoutes}
          isReview={isReview}
          setIsReview={setIsReview}
          invoiceDetails={invoiceDetails}
        />
      </Form>
    </Formik>
  );
}

function ChainSelectSection({
  chainCaip2Ids,
  isReview,
}: {
  chainCaip2Ids: ChainCaip2Id[];
  isReview: boolean;
}) {
  const ChevronIcon = ({ classes }: { classes?: string }) => (
    <WideChevron
      width="17"
      height="100%"
      direction="e"
      color={Color.lightGray}
      classes={classes}
      rounded={true}
    />
  );

  return (
    <div className="flex items-center justify-center space-x-7 sm:space-x-10">
      <ChainSelectField
        name="originCaip2Id"
        label="From"
        chainCaip2Ids={chainCaip2Ids}
        disabled={isReview}
      />
      <div className="flex flex-col items-center">
        <div className="flex mb-6 sm:space-x-1.5">
          <ChevronIcon classes="hidden sm:block" />
          <ChevronIcon />
          <ChevronIcon />
        </div>
        {/* <SwapChainsButton disabled={isReview} /> */}
      </div>
      <ChainSelectField
        name="destinationCaip2Id"
        label="To"
        chainCaip2Ids={chainCaip2Ids}
        disabled={isReview}
      />
    </div>
  );
}

function TokenSection({
  tokenRoutes,
  setIsNft,
  isReview,
}: {
  tokenRoutes: RoutesMap;
  setIsNft: (b: boolean) => void;
  isReview: boolean;
}) {
  const { values } = useFormikContext<TransferFormValues>();

  return (
    <div className="flex-1">
      <label htmlFor="tokenCaip19Id" className="block uppercase text-sm text-gray-500 pl-0.5">
        Token
      </label>

      <TokenSelectField
        name="tokenCaip19Id"
        originCaip2Id={values.originCaip2Id}
        destinationCaip2Id={values.destinationCaip2Id}
        tokenRoutes={tokenRoutes}
        disabled={isReview}
        setIsNft={setIsNft}
      />
    </div>
  );
}

function AmountSection({
  tokenRoutes,
  isNft,
  isReview,
  invoiceDetails,
}: {
  tokenRoutes: RoutesMap;
  isNft: boolean;
  isReview: boolean;
  invoiceDetails: any;
}) {
  const { values } = useFormikContext<TransferFormValues>();
  const { tokenBalance, tokenDecimals } = useOriginBalance(values, tokenRoutes);

  return (
    <div className="flex-1">
      <div className="flex justify-between pr-1">
        <label htmlFor="amount" className="block uppercase text-sm text-gray-500 pl-0.5">
          Amount
        </label>
        <TokenBalance label="My balance" balance={tokenBalance} decimals={tokenDecimals} />
      </div>
      {isNft ? (
        <SelectOrInputTokenIds disabled={isReview} tokenRoutes={tokenRoutes} />
      ) : (
        <div className="relative w-full">
          <TextField
            name="amount"
            value={invoiceDetails.totalAmount}
            classes="w-full"
            type="number"
            step="any"
            disabled={isReview}
          />
          {/* <MaxButton disabled={isReview} balance={balance} decimals={decimals} /> */}
        </div>
      )}
    </div>
  );
}

function RecipientSection({
  tokenRoutes,
  isReview,
  invoiceDetails,
}: {
  tokenRoutes: RoutesMap;
  isReview: boolean;
  invoiceDetails: any;
}) {
  const { values } = useFormikContext<TransferFormValues>();
  const { balance, decimals } = useDestinationBalance(values, tokenRoutes);

  // A crude way to detect transfer completions by triggering
  // toast on recipientAddress balance increase. This is not ideal because it
  // could confuse unrelated balance changes for message delivery
  // TODO replace with a polling worker that queries the hyperlane explorer
  const recipientAddress = invoiceDetails.billerAddress;
  const prevRecipientBalance = useRef<{ balance?: string; recipientAddress?: string }>({
    balance: '',
    recipientAddress: '',
  });
  useEffect(() => {
    if (
      recipientAddress &&
      balance &&
      prevRecipientBalance.current.balance &&
      prevRecipientBalance.current.recipientAddress === recipientAddress &&
      new BigNumber(balance).gt(prevRecipientBalance.current.balance)
    ) {
      toast.success('Recipient has received funds, transfer complete!');
    }
    prevRecipientBalance.current = { balance, recipientAddress };
  }, [balance, recipientAddress, prevRecipientBalance]);

  return (
    <div className="mt-4">
      <div className="flex justify-between pr-1">
        <label htmlFor="recipientAddress" className="block uppercase text-sm text-gray-500 pl-0.5">
          Recipient Address
        </label>
        <TokenBalance label="Remote balance" balance={balance} decimals={decimals} />
      </div>
      <div className="relative w-full">
        <TextField
          name="recipientAddress"
          value={invoiceDetails.billerAddress}
          classes="w-full"
          disabled={isReview}
        />
        {/* <SelfButton disabled={isReview} /> */}
      </div>
    </div>
  );
}

function TokenBalance({
  label,
  balance,
  decimals,
}: {
  label: string;
  balance?: string | null;
  decimals?: number;
}) {
  const value = !decimals ? fromWei(balance, decimals) : fromWeiRounded(balance, decimals, false);
  return <div className="text-xs text-gray-500 text-right">{`${label}: ${value}`}</div>;
}

function ButtonSection({
  tokenRoutes,
  isReview,
  setIsReview,
  invoiceDetails,
}: {
  tokenRoutes: RoutesMap;
  isReview: boolean;
  setIsReview: (b: boolean) => void;
  invoiceDetails: any;
}) {
  const { values } = useFormikContext<TransferFormValues>();

  const onDoneTransactions = () => {
    setIsReview(false);
    setTransferLoading(false);
    // resetForm();
  };
  const { triggerTransactions } = useTokenTransfer(onDoneTransactions);

  const { setTransferLoading } = useStore((s) => ({
    setTransferLoading: s.setTransferLoading,
  }));

  const triggerTransactionsHandler = async () => {
    setTransferLoading(true);

    const finalValues = {
      originCaip2Id: values.originCaip2Id,
      destinationCaip2Id: values.destinationCaip2Id,
      tokenCaip19Id: values.tokenCaip19Id,
      amount: invoiceDetails.totalAmount,
      recipientAddress: invoiceDetails.billerAddress,
    };

    await triggerTransactions(finalValues, tokenRoutes);
  };

  if (!isReview) {
    return (
      <ConnectAwareSubmitButton
        chainCaip2Id={values.originCaip2Id}
        text="Make Payment"
        classes="mt-4 px-3 py-1.5"
      />
    );
  }

  return (
    <div className="mt-4 flex items-center justify-between space-x-4">
      <SolidButton
        type="button"
        color="gray"
        onClick={() => setIsReview(false)}
        classes="px-6 py-1.5"
        icon={<ChevronIcon direction="w" width={13} color={Color.primaryBlue} />}
      >
        <span>Edit</span>
      </SolidButton>
      <SolidButton
        type="button"
        color="blue"
        onClick={triggerTransactionsHandler}
        classes="flex-1 px-3 py-1.5"
      >
        {`Send to ${getChainDisplayName(values.destinationCaip2Id)}`}
      </SolidButton>
    </div>
  );
}

function ReviewDetails({
  visible,
  tokenRoutes,
  invoiceDetails,
}: {
  visible: boolean;
  tokenRoutes: RoutesMap;
  invoiceDetails: any;
}) {
  const {
    values: { originCaip2Id, destinationCaip2Id, tokenCaip19Id: token },
  } = useFormikContext<TransferFormValues>();

  // const finalValues = {
  //   originCaip2Id: originCaip2Id,
  //   destinationCaip2Id: destinationCaip2Id,
  //   tokenCaip19Id: token,
  //   amount: invoiceDetails.totalAmount,
  //   recipientAddress: invoiceDetails.billerAddress,
  // };

  const amount = invoiceDetails.totalAmount;

  const route = getTokenRoute(originCaip2Id, destinationCaip2Id, token, tokenRoutes);
  const isNft = token && isNonFungibleToken(token);
  const sendValue = isNft ? amount.toString() : toWei(amount, route?.originDecimals).toString();
  const { isLoading, isApproveRequired } = useIsApproveRequired(token, sendValue, route!, visible);
  const originProtocol = getProtocolType(originCaip2Id);
  const originUnitName = ProtocolSmallestUnit[originProtocol];

  return (
    <div
      className={`${
        visible ? 'max-h-screen duration-1000 ease-in' : 'max-h-0 duration-500'
      } overflow-hidden transition-all`}
    >
      <label className="mt-4 block uppercase text-sm text-gray-500 pl-0.5">Transactions</label>
      {isLoading ? (
        <div className="py-6 flex items-center justify-center">
          <SmallSpinner />
        </div>
      ) : (
        <div className="mt-1.5 px-2.5 py-2 space-y-2 rounded border border-gray-400 bg-gray-150 text-sm break-all">
          {isApproveRequired && (
            <div>
              <h4>Transaction 1: Approve Transfer</h4>
              <div className="mt-1.5 ml-1.5 pl-2 border-l border-gray-300 space-y-1.5 text-xs">
                <p>{`Token Address: ${getTokenAddress(token)}`}</p>
                <p>{`Collateral Address: ${route?.baseRouterAddress}`}</p>
              </div>
            </div>
          )}
          <div>
            <h4>{`Transaction${isApproveRequired ? ' 2' : ''}: Transfer Remote`}</h4>
            <div className="mt-1.5 ml-1.5 pl-2 border-l border-gray-300 space-y-1.5 text-xs">
              <p>{`Remote Token: ${route?.destRouterAddress}`}</p>
              {isNft ? (
                <p>{`Token ID: ${sendValue}`}</p>
              ) : (
                <p>{`Amount (${originUnitName}): ${sendValue}`}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function validateFormValues(
  values: TransferFormValues,
  tokenRoutes: RoutesMap,
  balances: AppState['balances'],
) {
  const { originCaip2Id, destinationCaip2Id, amount, tokenCaip19Id, recipientAddress } = values;
  console.log(amount);
  console.log(recipientAddress);
  const route = getTokenRoute(originCaip2Id, destinationCaip2Id, tokenCaip19Id, tokenRoutes);
  if (!route) return { destinationCaip2Id: 'No route found for chains/token' };

  if (!originCaip2Id) return { originCaip2Id: 'Invalid origin chain' };
  if (!destinationCaip2Id) return { destinationCaip2Id: 'Invalid destination chain' };

  if (!tokenCaip19Id) return { tokenCaip19Id: 'Token required' };
  const { address: tokenAddress } = parseCaip19Id(tokenCaip19Id);
  if (!isValidAddress(tokenAddress)) return { tokenCaip19Id: 'Invalid token' };

  // const destProtocol = getProtocolType(destinationCaip2Id);
  // if (!isValidAddress(recipientAddress, destProtocol))
  //   return { recipientAddress: 'Invalid recipient' };

  const isNft = isNonFungibleToken(tokenCaip19Id);
  const parsedAmount = tryParseAmount(20);
  if (!parsedAmount || parsedAmount.lte(0))
    return { amount: isNft ? 'Invalid Token Id' : 'Invalid amount' };
  const sendValue = isNft ? parsedAmount : toWei(parsedAmount, route?.originDecimals);

  if (!isNft) {
    // Validate balances for ERC20-like tokens
    if (sendValue.gt(balances.senderTokenBalance)) return { amount: 'Insufficient balance' };
  } else {
    // Validate balances for ERC721-like tokens
    const { isSenderNftOwner, senderNftIds } = balances;
    const nftId = sendValue.toString();
    if (isSenderNftOwner === false || (senderNftIds && !senderNftIds.includes(nftId))) {
      return { amount: 'Token ID not owned' };
    }
  }

  if (
    config.withdrawalWhitelist &&
    !config.withdrawalWhitelist.split(',').includes(destinationCaip2Id)
  ) {
    return { destinationCaip2Id: 'Bridge is in deposit-only mode' };
  }

  if (
    config.transferBlacklist &&
    config.transferBlacklist.split(',').includes(`${originCaip2Id}-${destinationCaip2Id}`)
  ) {
    return { destinationCaip2Id: 'Route is not currently allowed' };
  }

  return {};
}

function useFormInitialValues(
  chainCaip2Ids: ChainCaip2Id[],
  tokenRoutes: RoutesMap,
): TransferFormValues {
  return useMemo(() => {
    const firstRoute = Object.values(tokenRoutes[chainCaip2Ids[0]]).filter(
      (routes) => routes.length,
    )[0][0];
    return {
      originCaip2Id: firstRoute.originCaip2Id,
      destinationCaip2Id: firstRoute.destCaip2Id,
      amount: '',
      tokenCaip19Id: '' as TokenCaip19Id,
      recipientAddress: '',
    };
  }, [chainCaip2Ids, tokenRoutes]);
}
