import { useEffect, useState } from "react";

type InitialValueType<T> = T | (() => T);

const isEmptyObject = (obj: object) =>
  obj && typeof obj === "object" && Object.keys(obj).length === 0;

const getStoredData = <T,>(
	key: string,
	initialValue: InitialValueType<T>
): T => {
	const storedData = sessionStorage.getItem(key);

	const data = storedData ? JSON.parse(storedData) : null;

	if (initialValue instanceof Function) {
		return initialValue();
	}

	if (Array.isArray(data) && data.length === 0) {
		return initialValue;
	}

	if (isEmptyObject(data)) {
		return initialValue;
	}

	return data ?? initialValue;
};

const useSessionStorage = <T,>(
	key: string,
	initialValue: InitialValueType<T>
): [T, React.Dispatch<React.SetStateAction<T>>] => {
	const [value, setValue] = useState(() => getStoredData(key, initialValue));

	useEffect(() => {
		sessionStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue];
};

export default useSessionStorage;
